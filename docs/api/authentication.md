# Authentication API Documentation

## Endpoints

### POST /api/auth/login
Authenticates a user and creates a session.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "id": "number",
  "username": "string",
  "fullName": "string",
  "role": "string"
}
```

### POST /api/auth/register
Creates a new user account.

**Request Body:**
```json
{
  "username": "string",
  "password": "string",
  "fullName": "string",
  "email": "string",
  "role": "string"
}
```

**Response:**
```json
{
  "id": "number",
  "username": "string",
  "fullName": "string",
  "role": "string"
}
```

### POST /api/auth/logout
Ends the current user session.

**Response:**
```json
{
  "message": "Logged out successfully"
}
```

### GET /api/auth/me
Returns the current authenticated user's information.

**Response:**
```json
{
  "id": "number",
  "username": "string",
  "fullName": "string",
  "role": "string",
  "email": "string"
}
```
