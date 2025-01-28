# Client Management Portal

A comprehensive enterprise-grade client management platform designed to streamline organizational workflow through an intelligent, secure digital workspace.

## Features

- 🔐 Advanced Authentication & Role-Based Access Control
- 👥 Client Management & Onboarding
- 📊 Work Allocation & Resource Management 
- 📋 Task Management System
- 🔍 Quality Control & Reviews
- ⏱️ SLA Monitoring
- 📈 Performance Analytics
- 📬 Real-time Communication
- 📄 Document Management
- ⚡ Real-time Updates via WebSocket

## Tech Stack

- Frontend: React + TypeScript with Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL with Drizzle ORM
- Authentication: Passport.js
- Real-time: WebSocket
- UI Components: shadcn/ui

## Local Development Setup

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- Git

### Installation Steps

1. Clone the repository:
```bash
git clone https://github.com/camayank/ClientManagementPortal.git
cd ClientManagementPortal
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Configure your `.env` file with the following variables:
```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

5. Run database migrations:
```bash
npm run db:push
```

6. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5000`

## AWS Deployment Guide

### Prerequisites

1. AWS Account with necessary permissions
2. AWS CLI installed and configured
3. Domain name (optional, but recommended)

### Deployment Steps

1. Create an RDS PostgreSQL Instance:
   ```bash
   aws rds create-db-instance \
     --db-instance-identifier client-portal \
     --db-instance-class db.t3.micro \
     --engine postgres \
     --allocated-storage 20 \
     --master-username admin \
     --master-user-password YOUR_PASSWORD
   ```

2. Create an Elastic Beanstalk Application:
   ```bash
   eb init client-portal --platform node.js --region us-east-1
   ```

3. Create the environment:
   ```bash
   eb create client-portal-prod \
     --instance-type t2.micro \
     --vpc.id vpc-xxx \
     --vpc.ec2subnets subnet-xxx,subnet-yyy \
     --vpc.elbsubnets subnet-xxx,subnet-yyy \
     --vpc.securitygroups sg-xxx
   ```

4. Configure environment variables:
   ```bash
   eb setenv \
     DATABASE_URL=postgresql://user:password@your-rds-endpoint:5432/dbname \
     NODE_ENV=production
   ```

5. Deploy the application:
   ```bash
   eb deploy
   ```

### Production Configuration

1. SSL/TLS Setup:
   - Create an SSL certificate using AWS Certificate Manager
   - Configure the load balancer to use HTTPS
   - Update security groups to allow HTTPS traffic

2. Domain Configuration:
   - Create a Route 53 hosted zone for your domain
   - Add an A record pointing to your Elastic Beanstalk environment
   - Configure HTTPS listener rules in the load balancer

3. Monitoring Setup:
   - Enable CloudWatch monitoring
   - Set up alarms for key metrics
   - Configure log streaming

### Security Best Practices

1. Network Security:
   - Use VPC with private subnets for RDS
   - Implement proper security groups
   - Enable WAF for the load balancer

2. Database Security:
   - Regular backups
   - Encryption at rest
   - Secure connection strings

3. Application Security:
   - Regular dependency updates
   - Input validation
   - Rate limiting
   - CORS configuration

## Environment Variables

```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Session
SESSION_SECRET=your-session-secret

# Email (if implementing)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password

# AWS (for production)
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=us-east-1
```

## Database Migrations

Run migrations:
```bash
npm run db:push
```

## Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Type checking
npm run check
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, email support@yourcompany.com or raise an issue in the GitHub repository.
