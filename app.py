import os
import re
import uuid
from datetime import date, datetime, timezone
from flask import Flask, jsonify, render_template, request
from dotenv import load_dotenv
from google.cloud import firestore
from firebase_config import get_db

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))
app = Flask(__name__)
app.config['JSON_SORT_KEYS'] = False
app.config['MAX_CONTENT_LENGTH'] = 1024 * 1024
# Firebase initializes lazily to let the UI display a useful error if credentials are missing.
def db():
    return get_db()

def reply(data=None, message='', status=200):
    return jsonify(success=status < 400, message=message, data=data), status

def fail(message, status=400):
    return reply(None, message, status)

def clean(value):
    return value.strip() if isinstance(value, str) else ''

def payload():
    obj = request.get_json(silent=True)
    if not isinstance(obj, dict):
        raise ValueError('Please submit a valid JSON object.')
    return obj

def required(data, keys):
    missing = [key for key in keys if not clean(data.get(key))]
    if missing:
        raise ValueError('Required fields: ' + ', '.join(missing))

def serial(doc):
    result = doc.to_dict() or {}
    result['id'] = doc.id
    return normalize(result)

def normalize(value):
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: normalize(v) for k, v in value.items()}
    if isinstance(value, list):
        return [normalize(v) for v in value]
    return value

def valid_day(value):
    try:
        return date.fromisoformat(value).isoformat() == value
    except (TypeError, ValueError):
        return False

def validate_book(data):
    required(data, ['title', 'author', 'genre', 'isbn'])
    try:
        quantity = int(data.get('quantity'))
    except (ValueError, TypeError):
        raise ValueError('Quantity must be a whole number.')
    if isinstance(data.get('quantity'), bool) or str(data.get('quantity')).strip() != str(quantity) or quantity < 0:
        raise ValueError('Quantity must be a non-negative whole number.')
    raw_year = data.get('year_published')
    year = None
    if raw_year is not None and str(raw_year).strip():
        try:
            year = int(raw_year)
        except (ValueError, TypeError):
            raise ValueError('Publication year must be a number.')
        if year < 1000 or year > date.today().year + 1:
            raise ValueError('Invalid publication year.')
    isbn = clean(data.get('isbn'))
    if len(isbn) > 32:
        raise ValueError('ISBN is too long.')
    return dict(title=clean(data['title']), author=clean(data['author']), genre=clean(data['genre']),
                publisher=clean(data.get('publisher')), year_published=year, isbn=isbn, quantity=quantity)

def validate_member(data):
    required(data, ['full_name', 'email', 'phone'])
    email = clean(data['email']).lower()
    if not re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', email):
        raise ValueError('Enter a valid email address.')
    membership_type = clean(data.get('membership_type')) or 'Student'
    if membership_type not in ('Student', 'Faculty', 'Staff', 'Other'):
        raise ValueError('Invalid membership type.')
    return dict(full_name=clean(data['full_name']), email=email, phone=clean(data['phone']),
                address=clean(data.get('address')), membership_type=membership_type)

def query_records(resource):
    records = [serial(doc) for doc in db().collection(resource).stream()]
    term = request.args.get('search', '').strip().lower()
    field = request.args.get('field', '').strip()
    searchable = {'books': ('book_id', 'title', 'author', 'isbn', 'genre'),
                  'members': ('member_id', 'full_name', 'email', 'phone', 'membership_type'),
                  'borrowings': ('borrowing_id', 'book_title', 'member_name', 'status')}
    if term:
        records = [r for r in records if any(term in str(r.get(k, '')).lower() for k in searchable[resource])]
    if field and field in searchable[resource]:
        value = request.args.get('value', '').strip().lower()
        records = [r for r in records if str(r.get(field, '')).lower() == value]
    sortkey = {'books': 'title', 'members': 'full_name', 'borrowings': 'created_at'}[resource]
    records.sort(key=lambda r: str(r.get(sortkey, '')).lower(), reverse=resource == 'borrowings')
    return records

def unique_field(collection, field, value, exclude=None):
    # Equality query requires no composite index.
    for doc in db().collection(collection).where(field, '==', value).limit(5).stream():
        if doc.id != exclude:
            raise ValueError(f'{field.replace("_", " ").upper()} already exists.')

def active_borrowings(field, doc_id):
    return any(doc.to_dict().get('status') == 'Borrowed'
               for doc in db().collection('borrowings').where(field, '==', doc_id).stream())

def new_id(prefix):
    return f'{prefix}-{uuid.uuid4().hex[:10].upper()}'

@app.errorhandler(413)
def too_large(_):
    return fail('Request is too large.', 413)

@app.route('/')
def home():
    return render_template('index.html')

@app.get('/test-firestore')
def test_firestore():
    try:
        list(db().collection('books').limit(1).stream())
        return reply({'connected': True}, 'Firestore connected successfully.')
    except Exception:
        app.logger.exception('Firestore test failed')
        return fail('Firestore connection failed. Check credentials and Firestore setup.', 500)

@app.get('/api/summary')
def summary():
    try:
        books = query_records('books')
        members = query_records('members')
        borrowings = query_records('borrowings')
        return reply(dict(total_books=len(books), total_members=len(members),
                          total_borrowings=len(borrowings),
                          active_borrowings=sum(b.get('status') == 'Borrowed' for b in borrowings),
                          returned_books=sum(b.get('status') == 'Returned' for b in borrowings),
                          available_copies=sum(int(b.get('available_copies', 0)) for b in books),
                          total_copies=sum(int(b.get('quantity', 0)) for b in books)))
    except Exception:
        app.logger.exception('Summary failed')
        return fail('Could not load dashboard.', 500)

@app.route('/api/<resource>', methods=['GET', 'POST'])
def collection_route(resource):
    if resource not in ('books', 'members', 'borrowings'):
        return fail('Unknown resource.', 404)
    try:
        if request.method == 'GET':
            return reply(query_records(resource))
        data = payload()
        if resource == 'books':
            book = validate_book(data)
            unique_field('books', 'isbn', book['isbn'])
            doc_id = new_id('BK')
            book.update(book_id=doc_id, available_copies=book['quantity'],
                        created_at=datetime.now(timezone.utc), updated_at=datetime.now(timezone.utc))
            db().collection('books').document(doc_id).set(book)
            return reply(normalize({'id': doc_id, **book}), 'Book added successfully.', 201)
        if resource == 'members':
            member = validate_member(data)
            unique_field('members', 'email', member['email'])
            doc_id = new_id('MB')
            member.update(member_id=doc_id, registration_date=date.today().isoformat(),
                          status='Active', created_at=datetime.now(timezone.utc))
            db().collection('members').document(doc_id).set(member)
            return reply(normalize({'id': doc_id, **member}), 'Member registered successfully.', 201)
        required(data, ['book_id', 'member_id', 'borrow_date', 'due_date'])
        borrow_day, due_day = clean(data['borrow_date']), clean(data['due_date'])
        if not valid_day(borrow_day) or not valid_day(due_day) or due_day < borrow_day:
            raise ValueError('Enter valid dates; due date must not precede borrow date.')
        book_ref = db().collection('books').document(clean(data['book_id']))
        member_ref = db().collection('members').document(clean(data['member_id']))
        doc_id = new_id('BR')
        borrowing_ref = db().collection('borrowings').document(doc_id)
        @firestore.transactional
        def create(tx):
            # DocumentReference.get(transaction=tx) returns a DocumentSnapshot,
            # unlike tx.get(ref) in some SDK versions.
            book_doc = book_ref.get(transaction=tx)
            member_doc = member_ref.get(transaction=tx)
            if not book_doc.exists or not member_doc.exists:
                raise ValueError('Book or member not found.')
            book, member = book_doc.to_dict(), member_doc.to_dict()
            if int(book.get('available_copies', 0)) < 1:
                raise ValueError('No available copies of this book.')
            if member.get('status') != 'Active':
                raise ValueError('Member is not active.')
            record = dict(borrowing_id=doc_id, book_id=book_ref.id, member_id=member_ref.id,
                          book_title=book.get('title', ''), member_name=member.get('full_name', ''),
                          borrow_date=borrow_day, due_date=due_day, return_date='', status='Borrowed',
                          created_at=datetime.now(timezone.utc))
            tx.update(book_ref, {'available_copies': int(book['available_copies']) - 1})
            tx.set(borrowing_ref, record)
            return record
        record = create(db().transaction())
        return reply(normalize({'id': doc_id, **record}), 'Borrowing recorded successfully.', 201)
    except ValueError as e:
        return fail(str(e))
    except Exception:
        app.logger.exception('Collection operation failed')
        return fail('Database operation failed. Check server logs.', 500)

@app.route('/api/<resource>/<record_id>', methods=['GET', 'PUT', 'DELETE'])
def record_route(resource, record_id):
    if resource not in ('books', 'members', 'borrowings'):
        return fail('Unknown resource.', 404)
    try:
        ref = db().collection(resource).document(record_id)
        doc = ref.get()
        if not doc.exists:
            return fail('Record not found.', 404)
        current = doc.to_dict() or {}
        if request.method == 'GET':
            return reply(serial(doc))
        if request.method == 'PUT':
            data = payload()
            if resource == 'books':
                updates = validate_book(data)
                unique_field('books', 'isbn', updates['isbn'], record_id)
                @firestore.transactional
                def update_book(tx):
                    fresh = ref.get(transaction=tx)
                    if not fresh.exists:
                        raise ValueError('Book not found.')
                    old = fresh.to_dict()
                    borrowed = int(old.get('quantity', 0)) - int(old.get('available_copies', 0))
                    if updates['quantity'] < borrowed:
                        raise ValueError(f'Quantity cannot be lower than {borrowed} borrowed copies.')
                    change = {**updates, 'available_copies': updates['quantity'] - borrowed,
                              'updated_at': datetime.now(timezone.utc)}
                    tx.update(ref, change)
                    return change
                updates = update_book(db().transaction())
            elif resource == 'members':
                updates = validate_member(data)
                unique_field('members', 'email', updates['email'], record_id)
                updates['updated_at'] = datetime.now(timezone.utc)
                ref.update(updates)
            else:
                if current.get('status') != 'Borrowed':
                    raise ValueError('Only active borrowings can be edited.')
                borrow_day = clean(data.get('borrow_date', current.get('borrow_date')))
                due_day = clean(data.get('due_date', current.get('due_date')))
                if not valid_day(borrow_day) or not valid_day(due_day) or due_day < borrow_day:
                    raise ValueError('Enter valid dates; due date must not precede borrow date.')
                updates = {'borrow_date': borrow_day, 'due_date': due_day,
                           'updated_at': datetime.now(timezone.utc)}
                ref.update(updates)
            return reply(normalize({'id': record_id, **current, **updates}), 'Record updated successfully.')
        if resource in ('books', 'members'):
            field = 'book_id' if resource == 'books' else 'member_id'
            if active_borrowings(field, record_id):
                raise ValueError('Cannot delete a record with active borrowings.')
            ref.delete()
        elif resource == 'borrowings':
            @firestore.transactional
            def delete_borrowing(tx):
                fresh = ref.get(transaction=tx)
                if not fresh.exists:
                    raise ValueError('Borrowing not found.')
                item = fresh.to_dict()
                if item.get('status') == 'Borrowed':
                    book_ref = db().collection('books').document(item['book_id'])
                    book_doc = book_ref.get(transaction=tx)
                    if book_doc.exists:
                        book = book_doc.to_dict()
                        tx.update(book_ref, {'available_copies': min(int(book.get('quantity', 0)),
                            int(book.get('available_copies', 0)) + 1)})
                tx.delete(ref)
            delete_borrowing(db().transaction())
        return reply(None, 'Record deleted successfully.')
    except ValueError as e:
        return fail(str(e))
    except Exception:
        app.logger.exception('Record operation failed')
        return fail('Database operation failed. Check server logs.', 500)

@app.post('/api/returns/<borrowing_id>')
def return_book(borrowing_id):
    try:
        ref = db().collection('borrowings').document(borrowing_id)
        @firestore.transactional
        def process(tx):
            borrowing_doc = ref.get(transaction=tx)
            if not borrowing_doc.exists:
                raise ValueError('Borrowing record not found.')
            item = borrowing_doc.to_dict()
            if item.get('status') != 'Borrowed':
                raise ValueError('This book was already returned.')
            book_ref = db().collection('books').document(item['book_id'])
            book_doc = book_ref.get(transaction=tx)
            if not book_doc.exists:
                raise ValueError('Book record not found.')
            book = book_doc.to_dict()
            tx.update(book_ref, {'available_copies': min(int(book.get('quantity', 0)),
                int(book.get('available_copies', 0)) + 1)})
            return_date = date.today().isoformat()
            tx.update(ref, {'status': 'Returned', 'return_date': return_date,
                            'updated_at': datetime.now(timezone.utc)})
            return return_date
        returned = process(db().transaction())
        return reply({'borrowing_id': borrowing_id, 'return_date': returned}, 'Book returned successfully.')
    except ValueError as e:
        return fail(str(e))
    except Exception:
        app.logger.exception('Return operation failed')
        return fail('Could not process return. Check server logs.', 500)

@app.post('/api/seed')
def seed():
    from datetime import timedelta
    samples = [
        ('Pride and Prejudice','Jane Austen','Classic','9780141439518',1813),
        ('Jane Eyre','Charlotte Brontë','Classic','9780141441146',1847),
        ('Little Women','Louisa May Alcott','Classic','9780147514011',1868),
        ('The Hobbit','J. R. R. Tolkien','Fantasy','9780547928227',1937),
        ('The Little Prince','Antoine de Saint-Exupéry','Fiction','9780156012195',1943),
        ('Frankenstein','Mary Shelley','Gothic','9780141439471',1818),
        ('The Secret Garden','Frances Hodgson Burnett','Fiction','9780141321066',1911),
        ('The Great Gatsby','F. Scott Fitzgerald','Classic','9780743273565',1925),
    ]
    try:
        client = db()
        now = datetime.now(timezone.utc)
        books = list(client.collection('books').stream())
        members = list(client.collection('members').stream())
        existing_isbn = {d.to_dict().get('isbn') for d in books}
        existing_email = {d.to_dict().get('email') for d in members}
        batch = client.batch()
        added = 0
        new_books = []
        new_members = []
        for title, author, genre, isbn, year in samples:
            if isbn in existing_isbn: continue
            ref = client.collection('books').document('DEMO-BK-'+isbn)
            if ref.get().exists: continue
            record = dict(book_id=ref.id,title=title,author=author,genre=genre,isbn=isbn,publisher='',year_published=year,quantity=5,available_copies=5,created_at=now,updated_at=now)
            new_books.append((ref,record))
        for i,name in enumerate(['Alex Rivera','Sam Reyes','Jamie Santos','Taylor Cruz'],1):
            email = f'reader{i}@example.com'
            if email in existing_email: continue
            ref = client.collection('members').document(f'DEMO-MB-{i}')
            if ref.get().exists: continue
            record = dict(member_id=ref.id,full_name=name,email=email,phone=f'000000000{i}',address='Sample address',membership_type='Student' if i<4 else 'Faculty',registration_date=date.today().isoformat(),status='Active',created_at=now)
            new_members.append((ref,record))
        for i,((br,b),(mr,m)) in enumerate(zip(new_books,new_members),1):
            ref = client.collection('borrowings').document('DEMO-BR-'+br.id)
            if ref.get().exists: continue
            returned = i==2
            borrowed = date.today()-timedelta(days=10 if i==3 else 2)
            due = borrowed+timedelta(days=7)
            if not returned: b['available_copies'] -= 1
            batch.create(ref,dict(borrowing_id=ref.id,book_id=br.id,member_id=mr.id,book_title=b['title'],member_name=m['full_name'],borrow_date=borrowed.isoformat(),due_date=due.isoformat(),return_date=date.today().isoformat() if returned else '',status='Returned' if returned else 'Borrowed',created_at=now))
            added += 1
        for ref,record in new_books+new_members:
            batch.create(ref,record)
            added += 1
        if added: batch.commit()
        return reply({'message':f'{added} sample records added.' if added else 'Sample collection already exists.'})
    except Exception:
        app.logger.exception('Sample import failed')
        return fail('Sample import failed. Check Firestore and retry.',500)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=int(os.getenv('PORT', '5000')),
            debug=os.getenv('FLASK_DEBUG', 'false').lower() == 'true')
