from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
import os, re
from datetime import datetime
import sqlite3

app = Flask(__name__)
app.config['SECRET_KEY'] = 'just for funss'

bcrypt = Bcrypt(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

DATABASE = "planner.db"

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()

    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        avatar_emoji TEXT DEFAULT '👤'
        )
    """)
    
    cur.execute("""
    CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        task_id TEXT NOT NULL,
        title TEXT NOT NULL,
        tasks TEXT NOT NULL,
        completed INTEGER DEFAULT 0,
        completed_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)
    
    cur.execute("PRAGMA table_info(users)")
    columns = [col[1] for col in cur.fetchall()]

    if "last_login" not in columns:
        cur.execute("ALTER TABLE users ADD column last_login TEXT")
    
    conn.commit()
    conn.close()

class User(UserMixin):
    def __init__(self, row):
        self.id = row["id"]
        self.username = row["username"]
        self.email = row['email']
        self.password = row["password"]
        self.avatar_emoji = row["avatar_emoji"]

@login_manager.user_loader
def load_user(user_id):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cur.fetchone()
    conn.close()
    return User(row) if row else None

# Routes
@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')

        conn = get_db()
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE username = ?", (username,))
        row = cur.fetchone()
        conn.close()
        

        if row and bcrypt.check_password_hash(row["password"], password):
            login_user(User(row))
            conn = get_db()
            cur = conn.cursor()

            cur.execute(
                "UPDATE users SET last_login = ? WHERE id = ?",
                (datetime.utcnow().isoformat(), row["id"])
            )
            conn.commit()
            conn.close()
            return redirect(url_for('dashboard'))
        
        return render_template('login.html', error='Invalid username or password')
        
        #this is validation checks, if the inputs are invalid, it will return an error message on the login page
        #and not allow you to login

    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form.get('username', '').strip()
        email = request.form.get('email', '').strip()
        password = request.form.get('password', '')
        confirm_password = request.form.get('confirm_password', '')

        # Validation Checks
        if not username or not email or not password:
            return render_template('register.html', error='All fields are required')
        #checks if all fields are filled

        if password != confirm_password:
            return render_template('register.html', error='Passwords do not match')
        
        pattern = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$'

        if not re.match(pattern, password):
            return render_template("register.html", error = 'Password must be at least 8 characters and include uppercase, lowercase, number and symbol.')
        #checks if passwords match

        conn = get_db()
        cur = conn.cursor()

        cur.execute("SELECT 1 FROM users WHERE username = ?",(username,))
        if cur.fetchone():
            conn.close()
            return render_template('register.html', error = 'Username already exists')
        
        cur.execute("SELECT 1 FROM users WHERE email = ?",(email,))
        if cur.fetchone():
            conn.close()
            return render_template('register.html', error = 'Email already exists')
        
        hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

        cur.execute("""
            INSERT INTO users (username, email, password)
            VALUES (?, ?, ?)
        """, (username, email, hashed_password))

        conn.commit()
        conn.close()

        return redirect(url_for('login'))  #redirects to login page after successful registration

    return render_template('register.html')

@app.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    if request.method == 'POST':
        new_username = request.form.get('username', '').strip()
        new_email = request.form.get('email', '').strip()
        current_password = request.form.get('current_password', '')
        new_password = request.form.get('new_password', '')
        confirm_new_password = request.form.get('confirm_new_password', '')
        new_avatar = request.form.get('avatar_emoji', '👤')

        # Basic validation
        if not new_username or not new_email:
            return render_template('profile.html', error="Username and email are required")
        
        conn = get_db()
        cur = conn.cursor()

# Get current values from DB
        cur.execute("SELECT username, email FROM users WHERE id = ?", (current_user.id,))
        current = cur.fetchone()

        if new_username != current['username']:
            cur.execute(
                "SELECT 1 FROM users WHERE username = ?",
                (new_username,)
            )
            if cur.fetchone():
                conn.close()
                return render_template('profile.html', error="Username already taken")

# Email check ONLY if changed
        if new_email != current['email']:
            cur.execute(
                "SELECT 1 FROM users WHERE email = ?",
                (new_email,)
            )
            if cur.fetchone():
                conn.close()
                return render_template('profile.html', error="Email already in use")

        
        if new_password or confirm_new_password:
            cur.execute(
                "SELECT password FROM users WHERE id = ?",
                (current_user.id,)
            )
            stored_password = cur.fetchone()[0]

            if not bcrypt.check_password_hash(stored_password, current_password):
                conn.close()
                return render_template('profile.html', error="Current password is incorrect")
            
            if new_password != confirm_new_password:
                conn.close()
                return render_template('profile.html', error = "New passwords do not match")
            
            hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')

            cur.execute("""
                UPDATE users
                SET password = ?
                WHERE id = ?
            """, (hashed_password, current_user.id))

        cur.execute("""
            UPDATE users
            SET username = ?, email = ?, avatar_emoji = ?
            WHERE id = ?
            """, (new_username, new_email, new_avatar, current_user.id))
        
        conn.commit()
        conn.close()

        login_user(load_user(current_user.id))  # refresh session
        return redirect(url_for('profile'))

    return render_template('profile.html')



@app.route('/dashboard')
@login_required  #protects route, only logged-in users can access
def dashboard():
    conn = get_db()
    cur = conn.cursor()

    #total tasks
    cur.execute(
        "SELECT COUNT(*) FROM tasks WHERE user_id = ?", (current_user.id,))
    total_tasks = cur.fetchone()[0]

    #completed tasks
    cur.execute(
        "SELECT COUNT(*) FROM tasks WHERE user_id = ? AND completed = 1",
        (current_user.id,))
    completed_tasks = cur.fetchone()[0]

    #last login
    cur.execute(
        "SELECT last_login FROM users WHERE id = ?", (current_user.id,))
    last_login = cur.fetchone()[0]

    conn.close()
    
    completion_percent = (
        int((completed_tasks / total_tasks) * 100)
        if total_tasks > 0 else 0
    )

    return render_template(
        'dashboard.html',
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        completion_percent=completion_percent,
        last_login=last_login
    )

@app.route('/create')
@login_required  #if not logged in redirects to login page because of the login_manager.login_view setting
def create():
    return render_template('create.html')

@app.route('/history')
@login_required
def history():
    return render_template('history.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/contact')
@login_required
def contact():
    return render_template('contact.html')

@app.route('/privacy')
@login_required
def privacy():
    return render_template('privacy.html')

@app.route('/about')
@login_required
def about():
    return render_template('about.html')

# API Routes for task management
@app.route('/api/tasks', methods=['GET'])
@login_required
def get_tasks():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM tasks WHERE user_id = ?", (current_user.id,))
    rows = cur.fetchall()
    conn.close()

    return jsonify ([{
        'id': row['task_id'],
        'title': row['title'],
        'tasks': row['tasks'],
        'completed': bool(row['completed']),
        'completedAt': row['completed_at']
    } for row in rows])

@app.route('/api/tasks', methods=['POST'])
@login_required
def save_tasks():
    data = request.json
    
    conn = get_db()
    cur = conn.cursor()

    cur.execute("DELETE FROM tasks WHERE user_id = ?", (current_user.id,))

    for task in data:
        cur.execute("""
            INSERT INTO tasks (user_id, task_id, title, tasks, completed, completed_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """,(
            current_user.id,
            str(task['id']),
            task['title'],
            task['tasks'],
            int(task.get('completed', False)),
            task.get('completedAt')
        ))

    conn.commit()
    conn.close()

    return jsonify({'status': 'success'})

if __name__ == '__main__':
    init_db()
    app.run(debug=True)
