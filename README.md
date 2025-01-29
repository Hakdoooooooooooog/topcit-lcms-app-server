# topcit-lcms-app-server

## Description

This project is a Learning Content Management System (LCMS) application designed for the TOPCIT program. It includes various modules such as user authentication, chapter management, quizzes, and topics.

## Prerequisites

Before setting up the TOPCIT LCMS server, ensure you have the following installed:

1. Node.js (v14 or higher)
2. npm or yarn package manager
3. PostgreSQL database
4. Ghostscript - Required for PDF compression functionality
   - Windows: Download and install from [Ghostscript Official Website](https://www.ghostscript.com/releases/gsdnld.html)
   - Linux: `sudo apt-get install ghostscript`
   - macOS: `brew install ghostscript`

## Installation Steps

1. Clone the repository

   ```sh
   git clone [repository-url]
   cd topcit-lcms-app-server
   ```

2. Install dependencies

   ```sh
   npm install
   ```

3. Configure environment variables

   - Copy `.env.example` to `.env`
   - Update the following variables:
     - Database connection string
     - AWS credentials
     - JWT secrets
     - Email configuration
     - Client and server URLs

4. Initialize and generate Prisma client

   ```sh
   npx prisma db push
   npx prisma generate
   ```

5. Start the development server
   ```sh
   npm run dev
   ```

## Features

- User Authentication
- Chapter Management
- Quiz Management
- Topic Management
- User Management
- Role Management
- Permission Management

## Project Modules

- **Controllers**: Handles the request and response logic.
- **Database**: Contains database models and queries.
- **Middleware**: Custom middleware functions.
- **Router**: Defines the application routes.
- **Schema**: Defines the data schema.
- **Services**: Business logic and services.
- **Types**: Type definitions.

## Important Notes

- Ensure Ghostscript is properly installed and accessible from the system PATH
- The compress-pdf library requires Ghostscript to function
- Make sure all AWS credentials are properly configured for S3 and CloudFront
- Database migrations should be handled using Prisma

## Troubleshooting

### PDF Compression Issues

If you encounter PDF compression errors:

1. Verify Ghostscript installation: `gs --version`
2. Check system PATH includes Ghostscript
3. Restart the application after installing Ghostscript

### Database Connection Issues

1. Verify DATABASE_URL in .env
2. Ensure PostgreSQL is running
3. Check database user permissions

## Deployment

1. Build the application
   ```sh
   npm run build
   ```
