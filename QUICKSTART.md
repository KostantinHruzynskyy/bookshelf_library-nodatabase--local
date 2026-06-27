# Quick Start Guide - User Authentication System

## 🚀 Get Started in 3 Steps

### Step 1: Start the Server
```bash
cd Bookshelf_library
npm start
```

### Step 2: Open in Browser
Navigate to: **http://localhost:3000**

### Step 3: Register or Login

#### New User?
1. Click **"Register"** in the top bar
2. Fill in:
   - Username (3-30 characters)
   - Email (valid email from allowed provider)
   - Password (8+ characters, include uppercase, numbers, or special chars)
3. Click **"Create Account"**
4. You'll be automatically logged in and redirected to your dashboard!

#### Existing User?
1. Click **"Login"** in the top bar
2. Enter your email and password
3. Check **"Remember me"** for extended sessions (30 days)
4. Click **"Log In"**
5. You'll be redirected to your dashboard!

## 📚 Features

### For Registered Users
- ✅ Upload books (via Admin Panel)
- ✅ View personal dashboard
- ✅ See upload statistics
- ✅ Manage your uploaded books
- ✅ Edit/delete your books

### Security Features
- 🔒 Password hashing (bcrypt)
- 🔒 Brute force protection
- 🔒 Secure session cookies
- 🔒 Input sanitization
- 🔒 Rate limiting

## 🎯 Quick Links

- **Home Page**: http://localhost:3000/
- **Register**: http://localhost:3000/register.html
- **Login**: http://localhost:3000/login.html
- **Dashboard**: http://localhost:3000/dashboard.html
- **Admin Panel**: http://localhost:3000/admin.html

## 🔑 Test Accounts

### Admin Account
- Email: `admin@bookshelf.com`
- Password: `admin123`

### Create Your Own
- Use the registration form
- Allowed email providers: gmail.com, yahoo.com, outlook.com, hotmail.com, etc.

## 📖 User Flow Example

```
1. Visit Register Page
   ↓
2. Fill Registration Form
   (username, email, password)
   ↓
3. Submit → Auto Login
   ↓
4. Redirect to Dashboard
   ↓
5. View Profile & Stats
   ↓
6. Click "Upload New Book"
   ↓
7. Go to Admin Panel
   ↓
8. Upload/Edit/Delete Books
   ↓
9. Books Linked to Your Account
   ↓
10. Logout When Done
```

## 🧪 Test the System

Run automated tests:
```bash
node test_auth.js
```

This will verify:
- ✅ Server is running
- ✅ All pages accessible
- ✅ API endpoints work
- ✅ Authentication required for protected routes
- ✅ Validation works correctly

## 📝 Common Registration Errors

| Error | Solution |
|-------|----------|
| "Username must be 3+ characters" | Use a longer username |
| "Invalid email format" | Enter a valid email (e.g., user@gmail.com) |
| "Domain not allowed" | Use Gmail, Yahoo, Outlook, etc. |
| "Password too weak" | Add uppercase, numbers, or special characters |
| "Username taken" | Choose a different username |
| "Email taken" | Use a different email or login instead |

## 🔐 Password Requirements

Your password must have:
- ✅ At least 8 characters
- ✅ At least 2 of these:
  - Uppercase letters (A-Z)
  - Lowercase letters (a-z)
  - Numbers (0-9)
  - Special characters (!@#$%^&*)

**Good Examples**:
- `MyBook123!`
- `SecurePass2024`
- `Library@2024`

**Bad Examples**:
- `password` (too weak)
- `12345678` (no letters)
- `abcdefgh` (no variety)

## 📊 API Quick Reference

### Authentication
```javascript
// Register
POST /api/auth/register
Body: { username, email, password }

// Login
POST /api/auth/login
Body: { email, password, remember }

// Logout
POST /api/auth/logout

// Check Auth Status
GET /api/auth/me
```

### User Data (Requires Auth)
```javascript
// Get Profile
GET /api/user/profile

// Get My Books
GET /api/user/books?page=1&limit=10
```

## 🎨 Dashboard Features

Your dashboard shows:
- 📚 **Books Uploaded** - Total count
- 📅 **Member Since** - Join date
- 👤 **Account Type** - User/Admin role
- 👤 **Profile Info** - Username, email, language
- 📖 **My Books** - List of your uploads

## 🔒 Security Tips

1. **Use Strong Passwords**: Mix letters, numbers, and symbols
2. **Don't Share Your Account**: Each user should have their own account
3. **Logout on Shared Computers**: Click "Logout" when done
4. **Use "Remember Me" on Personal Devices**: For convenience
5. **Keep Your Password Safe**: Don't write it down

## 🆘 Troubleshooting

### Can't Register?
- Check email format is valid
- Ensure password meets requirements
- Try a different username if taken

### Can't Login?
- Verify email and password are correct
- Check if account is locked (wait 30 minutes)
- Clear browser cookies and try again

### Dashboard Not Loading?
- Make sure you're logged in
- Check browser console for errors
- Try refreshing the page

### Session Expired?
- Login again
- Use "Remember me" for longer sessions

## 📚 Next Steps

1. ✅ Register an account
2. ✅ Explore your dashboard
3. ✅ Upload your first book
4. ✅ View it in the library
5. ✅ Share with friends!

---

**Happy Reading!** 📚✨

For detailed documentation, see `USER_SYSTEM.md` and `IMPLEMENTATION_SUMMARY.md`