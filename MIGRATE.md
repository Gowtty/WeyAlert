 # Reset the entire database (loses ALL data)
  cd backend
  rm db.sqlite3
  python manage.py migrate
  python manage.py createsuperuser  # Recreate admin user

  Final Setup Steps for Your Colleague:

  1. Pull latest code: git pull
  2. Activate venv: source venv/bin/activate
  3. Clean the database (using Option 1 or 2 above)
  4. Run migrations: python manage.py migrate
  5. Start servers: Backend on :8000, Frontend on :4200