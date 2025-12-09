# Comprehensive Testing Guide for Perelman ATS

This guide provides complete test data for all forms in the application. Use this to test each page and verify that all fields are working correctly.

## Table of Contents
1. [Candidates](#1-candidates)
2. [Clients](#2-clients)
3. [Vendors](#3-vendors)
4. [Requirements](#4-requirements)
5. [Submissions](#5-submissions)
6. [Interviews](#6-interviews)
7. [Timesheets](#7-timesheets)

---

## 1. Candidates

### Navigate to: `/candidates/new` or click "Add Candidate" from Bench page

### Basic Information
- **First Name**: John
- **Last Name**: TestCandidate
- **Email Address**: john.testcandidate@example.com
- **Phone Number**: 555-0123
- **LinkedIn URL**: https://www.linkedin.com/in/johntestcandidate (Note: Prefix is pre-filled)
- **Current Location**: New York, NY

### Work Authorization
- **Visa Status**: Select any available (e.g., H-1B)
- **Visa Expiry Date**: 2026-12-31
- **Relocation Preference**: Open to relocation

### Skills & Experience
- **Total Experience (Years)**: 8.5
- **Preferred Roles**: Full Stack Developer, Backend Developer, Solutions Architect
- **Primary Skills**:
  ```
  Java, Spring Boot, Microservices, AWS, Docker, Kubernetes, REST APIs, PostgreSQL, MongoDB, Redis
  ```
- **Secondary Skills**:
  ```
  Python, React, Node.js, TypeScript, GraphQL, Jenkins, CI/CD, Terraform
  ```

### Compensation
- **Hourly Pay Rate ($)**: 85.00
- **Annual Salary ($)**: 156000

### Status & Notes
- **Bench Status**: Available
- **Internal Notes**:
  ```
  Excellent candidate with strong technical skills. Available immediately.
  Strong experience with microservices architecture and cloud technologies.
  Great communication skills and team player.
  ```

### Expected Result
- Candidate should be created successfully
- You should be redirected to the candidate detail page
- All fields should be visible and correctly displayed
- Candidate should appear in the candidates list
- Candidate should appear in the bench page with "Available" status

---

## 2. Clients

### Navigate to: `/clients/new`

### Client Information
- **Client Name**: Test Corp Industries
- **Contact Name**: Jane TestClient
- **Contact Email**: jane.testclient@testcorp.com
- **Contact Phone**: 555-0456
- **Industry**: Technology
- **Address**: 123 Tech Street, Suite 400, San Francisco, CA 94105
- **Website**: https://www.testcorp.com
- **Preferred Communication Mode**: Email
- **Payment Terms**: Net 30
- **Payment Terms Days**: 30
- **Is Active**: Yes (checked)
- **Notes**:
  ```
  Major technology company, excellent payment history.
  Preferred vendor for cloud migration projects.
  Contact Jane for all communications.
  ```

### Expected Result
- Client should be created successfully
- You should be redirected to the client detail page
- All fields should be visible and correctly displayed
- Client should appear in the clients list with "Active" status

---

## 3. Vendors

### Navigate to: `/vendors/new`

### Vendor Information
- **Vendor Name**: Test Staffing Solutions
- **Tier Level**: Tier 1
- **Contact Name**: Bob TestVendor
- **Contact Email**: bob.testvendor@teststaffing.com
- **Contact Phone**: 555-0789
- **Preferred Communication Mode**: Phone
- **Payment Terms**: Net 45
- **Payment Terms Days**: 45
- **Website**: https://www.teststaffing.com
- **Address**: 456 Staffing Ave, Chicago, IL 60601
- **Is Active**: Yes (checked)

### Expected Result
- Vendor should be created successfully
- You should be redirected to the vendor detail page
- All fields should be visible and correctly displayed
- Vendor should appear in the vendors list with "Tier 1" badge

---

## 4. Requirements (Job Postings)

### Navigate to: `/requirements/new`

### Requirement Information
- **Job Title**: Senior Full Stack Developer
- **Client**: Select the "Test Corp Industries" client created above
- **Client Billing Rate ($)**: 125.00
- **Candidate Pay Rate ($)**: 85.00
- **Max Submissions**: 5
- **Required Skills**:
  ```
  Java, Spring Boot, React, AWS, Microservices, Docker, Kubernetes
  ```
- **Preferred Skills**:
  ```
  GraphQL, TypeScript, CI/CD, Terraform, PostgreSQL
  ```
- **Job Location**: San Francisco, CA
- **Work Mode**: Hybrid
- **Experience Required (Years)**: 8
- **Contract Duration (Months)**: 12
- **Contract Type**: C2C
- **Visa Requirement**: US Citizen or Green Card preferred
- **Job Description**:
  ```
  We are looking for an experienced Full Stack Developer to join our team and work on
  cutting-edge cloud-native applications. The ideal candidate will have strong experience
  with Java backend development and modern React frontend development.

  You will be working on:
  - Building scalable microservices using Java and Spring Boot
  - Developing responsive user interfaces with React and TypeScript
  - Deploying and maintaining applications on AWS
  - Implementing CI/CD pipelines
  - Collaborating with cross-functional teams

  This is an excellent opportunity to work with cutting-edge technologies in a dynamic environment.
  ```
- **Responsibility Description**:
  ```
  - Design and develop microservices using Java and Spring Boot
  - Build responsive and intuitive user interfaces with React
  - Deploy and maintain applications on AWS cloud infrastructure
  - Implement automated testing and CI/CD pipelines
  - Collaborate with product managers and designers
  - Mentor junior developers and conduct code reviews
  - Participate in architecture and design discussions
  - Ensure code quality and best practices
  ```
- **Additional Notes**:
  ```
  This is a high-priority position with potential for extension.
  Client prefers candidates with previous banking or financial services experience.
  Remote work available 2 days per week.
  ```
- **Requirement Status**: Open

### Expected Result
- Requirement should be created successfully
- You should be redirected to the requirement detail page
- All fields should be visible and correctly displayed
- Requirement should appear in the requirements list with "Open" status
- Client name should be displayed correctly

---

## 5. Submissions

### Navigate to: `/submissions/new`

### Prerequisites
- Create a Candidate (from section 1)
- Create a Client (from section 2)
- Create a Vendor (from section 3)
- Create a Requirement (from section 4)

### Submission Information
- **Candidate**: Select "John TestCandidate" created above
- **Requirement**: Select "Senior Full Stack Developer" created above
- **Vendor**: Select "Test Staffing Solutions" created above
- **Submission Status**: Submitted
- **Submission Date**: (Auto-filled with current date)
- **Expected Response Date**: (Set to 7 days from today)
- **Submission Notes**:
  ```
  Strong match for the position. Candidate has all required skills and 2 years additional experience.

  Key highlights:
  - 8.5 years of experience with Java and Spring Boot
  - Strong AWS and microservices background
  - Excellent communication skills
  - Available immediately
  - Rate expectations align with budget

  Recommended for first round interview.
  ```

### Expected Result
- Submission should be created successfully
- You should be redirected to the submission detail page
- All fields should be visible and correctly displayed
- Submission should appear in the submissions list
- Candidate, requirement, and vendor names should be displayed correctly
- Status should show as "Submitted"

---

## 6. Interviews

### Navigate to: `/interviews/new`

### Prerequisites
- Create a Submission (from section 5)

### Interview Information
- **Submission**: Select the submission created above
- **Interview Type**: Technical
- **Interview Date**: (Set to 3 days from today)
- **Interview Time**: 14:00 (2:00 PM)
- **Interview Mode**: Video Call
- **Interview Round**: 1
- **Interview Location**: Zoom Meeting - Link will be sent via email
- **Duration (Minutes)**: 60
- **Interviewer Name**: Sarah Technical Lead
- **Interviewer Email**: sarah.tech@testcorp.com
- **Interview Notes**:
  ```
  First round technical interview covering:

  1. Java and Spring Boot fundamentals (15 mins)
  2. Microservices architecture and design patterns (15 mins)
  3. AWS services and cloud deployment (15 mins)
  4. System design problem (15 mins)

  Candidate should be prepared to discuss:
  - Previous projects and technical challenges
  - Experience with distributed systems
  - Code quality and testing practices

  Zoom link: https://zoom.us/j/123456789
  ```
- **Interviewer Feedback**: (Leave empty for now - to be filled after interview)

### Expected Result
- Interview should be created successfully
- You should be redirected to the interview detail page
- All fields should be visible and correctly displayed
- Interview should appear in the interviews list
- Interview should show correct date, time, and type
- Candidate and requirement info should be visible

---

## 7. Timesheets

### Navigate to: `/timesheets`

**Note**: Timesheets page is primarily a viewing/tracking page, not a creation form. It displays timesheet data for placed candidates.

### Testing Timesheets Viewing
- Navigate to `/timesheets`
- Verify the page loads without errors
- Check that filters work (if any)
- Verify pagination works (if applicable)
- Check that timesheet data displays correctly

---

## Automated Testing

An automated test script is available at `scripts/test-all-forms.ts`

### To run the automated tests:

1. Make sure you're logged in to the application
2. Ensure your environment variables are set (`.env.local`)
3. Run the test script:
   ```bash
   npx ts-node scripts/test-all-forms.ts
   ```

### The script will:
- Test creating a candidate with all fields
- Test creating a client with all fields
- Test creating a vendor with all fields
- Test creating a requirement with all fields
- Test creating a submission linking candidate, requirement, and vendor
- Test creating an interview for the submission
- Display all created IDs for verification in the UI

---

## Verification Checklist

After creating test data, verify the following:

### Candidates
- [ ] Candidate appears in `/candidates` list
- [ ] Candidate appears in `/bench` page
- [ ] All fields are visible in candidate detail page
- [ ] LinkedIn URL has constant prefix
- [ ] Skills display correctly
- [ ] Bench status badge shows correct color

### Clients
- [ ] Client appears in `/clients` list
- [ ] Active status displays correctly
- [ ] Contact information is visible
- [ ] Payment terms display correctly

### Vendors
- [ ] Vendor appears in `/vendors` list
- [ ] Tier level badge displays correctly
- [ ] Contact information is visible
- [ ] Active status displays correctly

### Requirements
- [ ] Requirement appears in `/requirements` list
- [ ] Client name displays correctly
- [ ] Status badge shows "Open"
- [ ] Skills display correctly
- [ ] Work mode and location display correctly

### Submissions
- [ ] Submission appears in `/submissions` list
- [ ] Candidate name is clickable and links correctly
- [ ] Requirement title is clickable and links correctly
- [ ] Vendor name displays correctly
- [ ] Status badge displays correctly
- [ ] Expected response date is visible

### Interviews
- [ ] Interview appears in `/interviews` list
- [ ] Interview date and time display correctly
- [ ] Interview type badge displays correctly
- [ ] Candidate and requirement info display correctly
- [ ] Interview details are editable

---

## Common Issues and Solutions

### Issue: "User or team information not available"
**Solution**: Make sure you're logged in and your user account has a team assigned.

### Issue: "Visa status not found"
**Solution**: Run the database setup script to seed default visa statuses:
```bash
node scripts/setup-database.js
```

### Issue: "Failed to create candidate/client/vendor"
**Solution**:
1. Check browser console for specific error messages
2. Verify all required fields are filled
3. Check that team_id is properly set in your user account
4. Verify database permissions

### Issue: LinkedIn URL prefix keeps getting removed
**Solution**: This has been fixed. The prefix `https://www.linkedin.com/in/` is now constant and cannot be removed.

---

## Next Steps

After completing all manual tests:

1. ✅ Verify all data appears correctly in list views
2. ✅ Verify all data appears correctly in detail views
3. ✅ Test editing existing records
4. ✅ Test filtering and search functionality
5. ✅ Test pagination (if applicable)
6. ✅ Check responsive design on mobile
7. ✅ Verify all relationships (candidate -> submission -> interview) work correctly

---

## Need Help?

If you encounter any issues during testing:
1. Check the browser console for error messages
2. Check the Next.js dev server console for API errors
3. Verify your database schema is up to date
4. Ensure environment variables are correctly set
5. Check that you have proper permissions for the operations

---

**Happy Testing! 🎉**
