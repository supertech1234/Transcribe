<!--
Author: Supertech1234
Github Repo: @https://github.com/supertech1234

MIT License

Copyright (c) 2025 supertech1234

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
-->

# Audio/Video Transcription Web Application

A powerful web application for transcribing audio and video files using OpenAI's Whisper model or Azure Speech Services. This application provides accurate transcriptions with speaker identification capabilities and supports multiple output formats.

## Screenshot
![image](https://github.com/user-attachments/assets/9a784993-e6b4-46b8-9b5d-a964bc7e75ca)


## Features

- **Accurate Transcription**: Powered by OpenAI's Whisper model or Azure Speech Services for high-quality transcriptions
- **Speaker Identification**: Automatically identifies different speakers in the audio
- **Multiple Format Support**: Upload audio or video files in various formats
- **Download Options**: Export transcriptions in TXT, DOCX, or SRT subtitle formats
- **Fast Processing**: Efficient processing with automatic chunking for large files (up to 500MB)
- **Concurrent Processing**: Support for up to 100 concurrent transcription jobs
- **Job Isolation**: Each transcription job gets its own directory for better organization and reliability
- **Automatic Cleanup**: Built-in cleanup service for old job directories and temporary files
- **Responsive UI**: Modern, user-friendly interface built with Next.js 14 and Tailwind CSS
- **Secure Authentication**: SAML 2.0 authentication integration with Okta
- **Single Sign-On**: Seamless SSO experience with Okta provider

## Configuration Options

The application provides several configuration options during transcription:

- **Standard Mode**: Basic transcription without speaker identification
- **Speaker Identification**: Identifies different speakers in the audio
- **Azure Speech**: Uses Azure Cognitive Services for enhanced transcription with more accurate speaker identification

These options can be toggled before starting the transcription process.

## System Requirements

- Node.js 20.x or higher
- npm 10.x or higher
- FFmpeg (for audio/video processing)
- 4GB+ RAM recommended for processing larger files

## Environment Variables

Create a `.env.local` file in the root directory using the provided `.env.local.sample` as a template. Below are the required environment variables:

```env
# Storage Configuration
UPLOAD_DIR=./storage/uploads
#UPLOAD_DIR=/var/www/transcription/uploads  # Example for production

# API Configuration
# OpenAI API Key (fallback)
#OPENAI_API_KEY=your-openai-api-key-here

# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your-azure-openai-api-key-here
AZURE_OPENAI_ENDPOINT=https://your-endpoint.openai.azure.com/
AZURE_OPENAI_API_VERSION=2023-12-01-preview
#AZURE_OPENAI_API_VERSION=2025-02-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=whisper

# API Provider Selection
USE_AZURE_OPENAI=true  # Set to "true" to use Azure OpenAI, "false" to use standard OpenAI

# Azure Speech Service (Cognitive Services)
AZURE_SPEECH_KEY=your-azure-speech-key-here
AZURE_SPEECH_REGION=your-region  # Example: eastus, westus2, northcentralus

# Audio Processing Configuration
AUDIO_FORMAT=wav
AUDIO_SAMPLING_RATE=16000
AUDIO_CHANNELS=1
AUDIO_BIT_DEPTH=16

# Authentication Configuration
AUTH_ENABLED=true  # Server-side authentication control
NEXT_PUBLIC_AUTH_ENABLED=true  # Client-side authentication control

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here  # Generate with: openssl rand -base64 32
NEXTAUTH_DEBUG=false  # Set to false in production (true for development)

# Okta Configuration (only used when AUTH_ENABLED=true)
OKTA_ISSUER=https://your-okta-domain.okta.com
OKTA_CLIENT_ID=your-client-id-here
OKTA_CLIENT_SECRET=your-client-secret-here

# Cleanup Configuration
CLEANUP_ENABLED=true  # Enable/disable automatic cleanup
CLEANUP_INTERVAL_MINUTES=60  # Run cleanup every 60 minutes
CLEANUP_FILE_AGE_MINUTES=120  # Delete files older than 120 minutes
JOB_FOLDER_RETENTION_HOURS=24  # Keep job folders for 24 hours before deletion
CLEANUP_DIRECTORIES=storage/tmp,storage/metadata,storage/uploads  # Directories to clean
CLEANUP_EXCLUDE_PATTERNS=*.keep,*.gitkeep  # Files to exclude from cleanup

# Debug Configuration
FFMPEG_DEBUG=false  # Set to true to enable FFmpeg debug logging or false to disable
```

## Automatic Cleanup

The application includes a comprehensive cleanup system for managing temporary and uploaded files:

### Cleanup Configuration

- **Enable/Disable**: Set `CLEANUP_ENABLED=true` to activate automatic cleanup
- **Interval**: Configure how often cleanup runs with `CLEANUP_INTERVAL_MINUTES`
- **File Age**: Set minimum file age for deletion with `CLEANUP_FILE_AGE_MINUTES`
- **Job Retention**: Configure job folder retention with `JOB_FOLDER_RETENTION_HOURS`
- **Target Directories**: Specify which directories to clean in `CLEANUP_DIRECTORIES`
- **Exclusions**: Protect specific files using patterns in `CLEANUP_EXCLUDE_PATTERNS`

### Cleanup Behavior

The cleanup job will:
- Run at the specified interval when enabled
- Remove files older than the specified age
- Clean only specified directories
- Preserve excluded files
- Delete job-specific folders after the retention period
- Log cleanup activities
- Handle errors gracefully

### Directory Structure

```
storage/
├── tmp/              # Temporary processing files
│   ├── job-id-1/     # Isolated job folder for job 1
│   ├── job-id-2/     # Isolated job folder for job 2
│   └── ...           # One folder per job
├── metadata/         # Transcription metadata
└── uploads/          # Uploaded audio/video files
```

### Cleanup API Endpoints

The application provides API endpoints to manage cleanup operations:

- **POST /api/cleanup**: Triggers cleanup of all old job folders
- **DELETE /api/cleanup/job/[jobId]**: Cleans up a specific job folder

## Authentication Configuration

The application supports flexible authentication through Okta that can be enabled or disabled using environment variables:

### Authentication Toggle Variables

- `AUTH_ENABLED`: Controls server-side authentication (middleware)
- `NEXT_PUBLIC_AUTH_ENABLED`: Controls client-side authentication behavior

Both variables should be set to the same value:
- Set to `true` to enable authentication
- Set to `false` to disable authentication

### Authentication States

When authentication is enabled (`AUTH_ENABLED=true` and `NEXT_PUBLIC_AUTH_ENABLED=true`):
- Users must sign in through Okta
- All API routes and pages are protected
- Session management is active
- Okta configuration is required

When authentication is disabled (`AUTH_ENABLED=false` and `NEXT_PUBLIC_AUTH_ENABLED=false`):
- No sign-in required
- Direct access to all routes
- Login page redirects to home
- Okta configuration is optional

## Local Development Setup

1. Clone the repository:
   ```bash
   git clone https://your-repository-url.git
   cd transcription-webapp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.local.sample .env.local
   ```

4. Configure environment variables:
   - Set authentication toggle preferences
   - Add API keys and endpoints
   - Configure storage locations

5. Configure Okta (if using authentication):
   - Create an Okta developer account
   - Set up a new OIDC application
   - Configure redirect URI: `http://localhost:3000/api/auth/callback/okta`
   - Add Okta credentials to `.env.local`

6. Create storage directories:
   ```bash
   mkdir -p storage/uploads storage/tmp storage/metadata
   chmod 755 storage storage/uploads storage/tmp storage/metadata
   ```

7. Start development server:
   ```bash
   npm run dev
   ```

## Production Deployment

### Pre-deployment Checklist

1. **Environment Configuration**:
   - Set `NODE_ENV=production`
   - Set `NEXTAUTH_DEBUG=false`
   - Configure authentication toggle variables
   - Set production URLs and endpoints

2. **Authentication Setup**:
   - Decide on authentication requirement
   - Configure both AUTH_ENABLED variables
   - Update Okta redirect URIs for production

3. **Security Measures**:
   - Enable HTTPS
   - Configure secure cookies
   - Set up CORS policies
   - Enable rate limiting

4. **Performance Optimization**:
   - Enable caching
   - Configure CDN if needed
   - Set up proper monitoring

### Deployment Steps

1. **Prepare the Application**:
   ```bash
   # Install dependencies
   npm install --production

   # Build the application
   npm run build
   ```

2. **Environment Setup**:
   ```bash
   # Create and configure environment file
   cp .env.local.sample .env.local
   vi .env.local

   # Essential production settings:
   # - Set NODE_ENV=production
   # - Set NEXTAUTH_DEBUG=false
   # - Configure production URLs and endpoints
   ```

3. **Server Configuration**:
   ```bash
   # Set up PM2 for process management
   npm install -g pm2

   # Start the application
   sudo pm2 start npm --name "transcription" -- start

   # Save PM2 configuration
   sudo pm2 save
   ```

4. **Monitoring Setup**:
   ```bash
   # Monitor the application
   sudo pm2 monit

   # View logs
   sudo pm2 logs transcription
   ```

### AWS EC2 Deployment

#### Prerequisites

- AWS account with EC2 and ELB access
- Domain name (optional, but recommended)
- SSH access to EC2 instances

#### EC2 Instance Setup

1. **Launch EC2 Instances**:
   - Amazon Linux 2 or Ubuntu Server 22.04 LTS recommended
   - t3.medium or larger instance type recommended (4GB+ RAM)
   - Configure security groups to allow HTTP (80), HTTPS (443), and SSH (22)

2. **Connect to your instance**:
   ```bash
   ssh -i your-key.pem ec2-user@your-instance-ip
   ```

3. **Install required software**:
   ```bash
   # Update system packages
   sudo yum update -y   # Amazon Linux
   # OR
   sudo apt update && sudo apt upgrade -y   # Ubuntu

   # Install Node.js 20.x
   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -   # Amazon Linux
   # OR
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -   # Ubuntu
   
   sudo yum install -y nodejs   # Amazon Linux
   # OR
   sudo apt install -y nodejs   # Ubuntu

   # Install FFmpeg
   sudo yum install -y ffmpeg   # Amazon Linux
   # OR
   sudo apt install -y ffmpeg   # Ubuntu

   # Install PM2 globally
   sudo npm install -y pm2 -g

   # Install Apache
   sudo yum install -y httpd   # Amazon Linux
   # OR
   sudo apt install -y apache2   # Ubuntu
   ```

4. **Configure Apache as a reverse proxy**:
   ```bash
   # Amazon Linux
   sudo vi /etc/httpd/conf.d/transcription.conf
   
   # Ubuntu
   sudo vi /etc/apache2/sites-available/transcription.conf
   ```

   Add the following configuration:
   ```apache
   <VirtualHost *:80>
       ServerName transcribe.yourdomain
       Redirect permanent / https://transcribe.yourdomain/
   </VirtualHost>

   <VirtualHost *:443>
       ServerName transcribe.yourdomain
       ServerAdmin webmaster@transcribe.yourdomain

       SSLEngine On
       SSLCertificateFile /etc/apache2/ssl/transcribe.yourdomain.cer
       SSLCertificateKeyFile /etc/apache2/ssl/transcribe.yourdomain.key

       # Strong SSL Settings
       SSLProtocol all -SSLv2 -SSLv3 -TLSv1 -TLSv1.1
       SSLCipherSuite EECDH+AESGCM:EDH+AESGCM:AES256+EECDH:AES256+EDH
       SSLHonorCipherOrder on
       SSLCompression off

       KeepAlive On
       KeepAliveTimeout 1
       MaxKeepAliveRequests 0

       ProxyPreserveHost On
       ProxyPass / http://localhost:3000/
       ProxyPassReverse / http://localhost:3000/
       ProxyTimeout 7200

       ErrorLog ${APACHE_LOG_DIR}/transcription-error.log
       CustomLog ${APACHE_LOG_DIR}/transcription-access.log combined
   </VirtualHost>


   ```

   Enable the site and required modules (Ubuntu only):
   ```bash
   sudo a2ensite transcription.conf
   sudo a2enmod proxy proxy_http
   ```

   Restart Apache:
   ```bash
   sudo systemctl restart httpd   # Amazon Linux
   # OR
   sudo systemctl restart apache2   # Ubuntu
   ```

5. **Deploy the application**:
   ```bash
   # Create application directory
   sudo mkdir -p /var/www/transcription
   sudo chown ec2-user:ec2-user /var/www/transcription   # Amazon Linux
   # OR
   sudo chown ubuntu:ubuntu /var/www/transcription   # Ubuntu

   # Clone the repository
   cd /var/www
   git clone https://your-repository-url.git transcription
   cd transcription

   # Install dependencies
   npm install

   # Create storage directories with proper permissions
   mkdir -p storage/uploads storage/tmp storage/metadata
   chmod 755 storage storage/uploads storage/tmp storage/metadata

   # Create environment file
   cp .env.local.sample .env.local
   vi .env.local   # Edit with your API keys and settings
   
   # Set UPLOAD_DIR to absolute path
   # UPLOAD_DIR=/var/www/transcription/storage/uploads

   # Build the application
   npm run build
   ```

6. **Configure PM2 to manage the application**:
   ```bash
   # Start the application with PM2
   sudo pm2 start npm --name "transcription" -- start

   # Configure PM2 to start on system boot
   sudo pm2 startup
   # Run the command that PM2 outputs

   # Save the PM2 configuration
   sudo pm2 save
   ```

## Technical Implementation

### Frontend
- **React 18 with Next.js 14**: Server-side rendering for improved performance
- **NextAuth.js 4**: Authentication handling with Okta provider
- **Tailwind CSS 3**: Utility-first CSS framework for responsive design
- **Client-side State Management**: React hooks for managing application state
- **Protected Routes**: Authentication-based access control
- **Animated Transitions**: CSS animations for smooth UI state changes

### Authentication Flow
- **SAML 2.0**: Industry-standard authentication protocol
- **Okta Integration**: Secure identity provider integration
- **Session Management**: Secure handling of user sessions
- **Protected API Routes**: Authentication middleware for API protection
- **Automatic Redirects**: Smart redirection for unauthenticated users

### Backend
- **Next.js API Routes**: Serverless API endpoints for transcription processing
- **File Processing Pipeline**: 
  - File validation and secure storage
  - Audio extraction and format conversion using FFmpeg
  - Chunking for large files
  - Parallel processing for improved performance
- **Dual Transcription Engines**:
  - OpenAI Whisper model for standard transcription
  - Azure Speech Services for enhanced speaker identification 
- **Job Management**:
  - Isolated job directories for each transcription
  - Automatic cleanup of old job folders
  - API endpoints for manual cleanup

## Browser Compatibility

The application has been tested and works on:
- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

For older browsers, some visual animations may be limited.

## User Guide

1. **Sign In**: Click "Sign in with Okta" on the login page (if authentication is enabled)
2. **Upload a File**: Drag and drop or click to select an audio/video file
3. **Configure Options**: Toggle Speaker Identification and/or Azure Speech if needed
4. **Start Transcription**: Click the "Start Transcription" button
5. **View Results**: Once processing is complete, the transcription will be displayed
6. **Download Options**: Download the transcription in TXT, DOCX, or SRT format
7. **Customize Speakers**: If Speaker Identification was used, you can customize speaker names

For large files, the transcription process may take several minutes depending on the file size and server resources.

## Known Limitations

- Maximum file size is limited to 500MB
- Very noisy audio may reduce transcription accuracy
- Speaker identification works best with clear audio and distinct speakers
- Processing time increases with file size and complexity
- Concurrent processing is limited by available server resources

## License
MIT License

Copyright (c) 2025 supertech1234

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Support

For support, please open an issue. 
