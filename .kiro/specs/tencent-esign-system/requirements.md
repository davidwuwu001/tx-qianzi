# Requirements Document

## Introduction

本系统是一个基于腾讯电子签API的便捷签约管理平台，采用Next.js技术栈开发，部署于阿里云服务器。系统支持多城市管理，实现合同的发起、签署、审批和状态管理的完整流程。

**系统特点：**
- 两级角色体系：系统管理员 + 城市管理员
- 多城市数据隔离与模板配置
- 产品与合同模板绑定
- 签署流程：乙方先签 → 城市管理员审批 → 甲方自动签署
- 支持签署链接生成（二维码/链接）和短信发送

**开发计划：**
- MVP阶段：登录认证 + 发起签约 + 签约状态管理
- 后续迭代：城市管理 + 产品/模板管理 + 审批流程 + 短信通知 + 数据统计

## Glossary

- **System**：腾讯电子签便捷签约系统
- **Admin**：管理员，包括系统管理员和城市管理员
- **System_Admin**：系统管理员，拥有最高权限，可管理所有城市、用户和全局配置
- **City_Admin**：城市管理员，管理本城市的签约业务、审批和本地模板
- **Ordinary_User**：普通用户，可发起签约和查看自己的签约记录，主要使用移动端
- **Party_A**：甲方，发起签约的企业方，使用自动签章
- **Party_B**：乙方，被邀请签署合同的个人或企业
- **Contract**：合同/签约记录
- **Product**：产品，业务产品与合同模板的绑定关系
- **Template**：合同模板，腾讯电子签中配置的模板
- **City**：城市，用于数据隔离和模板配置的组织单元
- **Sign_Link**：签署链接，用于乙方进行H5签署的链接，有效期30分钟
- **Flow**：签署流程，腾讯电子签中的合同流程
- **Callback**：回调通知，腾讯电子签主动推送的状态变更通知

## Requirements

### Requirement 1: 管理员登录认证

**User Story:** As an Admin, I want to securely log into the system, so that I can access the contract management features.

#### Acceptance Criteria

1. WHEN an Admin visits the admin login page, THE System SHALL display login form with username/password fields and phone verification code option
2. WHEN an Admin submits valid username and password, THE System SHALL authenticate the user and redirect to the admin dashboard
3. WHEN an Admin requests phone verification, THE System SHALL send a verification code via SMS to the registered phone number
4. WHEN an Admin submits valid phone number and verification code, THE System SHALL authenticate the user and redirect to the admin dashboard
5. IF an Admin submits invalid credentials, THEN THE System SHALL display an error message and remain on the login page
6. IF an Admin submits incorrect verification code 3 times, THEN THE System SHALL lock the verification for 5 minutes
7. WHEN an Admin is authenticated, THE System SHALL create a JWT session with appropriate expiration time
8. WHEN a session expires, THE System SHALL redirect the user to the login page
9. WHEN an Admin logs out, THE System SHALL invalidate the session and redirect to login page

### Requirement 2: 普通用户登录认证

**User Story:** As an Ordinary_User, I want to securely log into the mobile system, so that I can initiate contracts and manage my signing records.

#### Acceptance Criteria

1. WHEN an Ordinary_User visits the mobile login page, THE System SHALL display a mobile-optimized login form with phone verification code option
2. WHEN an Ordinary_User requests phone verification, THE System SHALL send a verification code via SMS to the phone number
3. WHEN an Ordinary_User submits valid phone number and verification code, THE System SHALL authenticate the user and redirect to the mobile dashboard
4. IF an Ordinary_User submits invalid phone number, THEN THE System SHALL display an error message
5. IF an Ordinary_User submits incorrect verification code 3 times, THEN THE System SHALL lock the verification for 5 minutes
6. WHEN an Ordinary_User is authenticated, THE System SHALL create a JWT session with appropriate expiration time
7. WHEN a session expires, THE System SHALL redirect the user to the mobile login page
8. WHEN an Ordinary_User logs out, THE System SHALL invalidate the session and redirect to mobile login page
9. THE System SHALL support automatic login for returning users (remember login state)

### Requirement 3: 普通用户发起签约流程

**User Story:** As an Ordinary_User, I want to initiate a contract signing process on mobile, so that I can send contracts to Party_B for signing.

#### Acceptance Criteria

1. WHEN an Ordinary_User clicks "发起签约" on mobile, THE System SHALL display a mobile-optimized form to select product and enter Party_B information
2. WHEN an Ordinary_User selects a product, THE System SHALL load the associated contract template information and required fields
3. WHEN an Ordinary_User enters Party_B information (name, phone, ID number if required), THE System SHALL validate the input format
4. IF Party_B information is invalid, THEN THE System SHALL display specific validation error messages
5. WHEN an Ordinary_User submits valid Party_B information, THE System SHALL call Tencent E-Sign CreateFlow API to create a signing flow
6. WHEN CreateFlow succeeds, THE System SHALL call CreateDocument API to bind template and fill form fields
7. WHEN CreateDocument succeeds, THE System SHALL call StartFlow API to initiate the signing process
8. WHEN StartFlow succeeds, THE System SHALL call CreateFlowSignUrl API to generate Party_B's signing link
9. WHEN signing link is generated, THE System SHALL display mobile-optimized options to copy link, show QR code, or send via SMS
10. WHEN an Ordinary_User chooses to send via SMS, THE System SHALL send the signing link to Party_B's phone number
11. WHEN the signing flow is successfully initiated, THE System SHALL save the contract record with status "待乙方签署"
12. IF any API call fails, THEN THE System SHALL display the error message and allow retry
13. THE System SHALL support saving contract as draft before submitting

### Requirement 4: 发起签约流程（城市管理员）

**User Story:** As a City_Admin, I want to initiate a contract signing process, so that I can send contracts to Party_B for signing.

#### Acceptance Criteria

1. WHEN a City_Admin clicks "发起签约", THE System SHALL display a form to select product and enter Party_B information
2. WHEN a City_Admin selects a product, THE System SHALL load the associated contract template information and required fields
3. WHEN a City_Admin enters Party_B information (name, phone, ID number if required), THE System SHALL validate the input format
4. IF Party_B information is invalid, THEN THE System SHALL display specific validation error messages
5. WHEN a City_Admin submits valid Party_B information, THE System SHALL call Tencent E-Sign CreateFlow API to create a signing flow
6. WHEN CreateFlow succeeds, THE System SHALL call CreateDocument API to bind template and fill form fields
7. WHEN CreateDocument succeeds, THE System SHALL call StartFlow API to initiate the signing process
8. WHEN StartFlow succeeds, THE System SHALL call CreateFlowSignUrl API to generate Party_B's signing link
9. WHEN signing link is generated, THE System SHALL display options to copy link, show QR code, or send via SMS
10. WHEN a City_Admin chooses to send via SMS, THE System SHALL send the signing link to Party_B's phone number
11. WHEN the signing flow is successfully initiated, THE System SHALL save the contract record with status "待乙方签署"
12. IF any API call fails, THEN THE System SHALL display the error message and allow retry
13. THE System SHALL support saving contract as draft before submitting

### Requirement 5: 普通用户签约状态管理

**User Story:** As an Ordinary_User, I want to view and manage my contract signing status on mobile, so that I can track the progress of contracts I initiated.

#### Acceptance Criteria

1. WHEN an Ordinary_User visits the mobile contract list page, THE System SHALL display a mobile-optimized list of contracts they created
2. THE System SHALL support filtering contracts by status: 草稿, 待乙方签署, 待甲方签署, 已完成签署, 已拒签, 已过期
3. THE System SHALL support searching contracts by Party_B name or phone number
4. WHEN displaying contract list on mobile, THE System SHALL show: contract name, Party_B info, status, creation time in a mobile-friendly layout
5. WHEN an Ordinary_User taps on a contract, THE System SHALL display mobile-optimized contract details including signing timeline
6. WHEN a contract status is "待乙方签署", THE System SHALL allow regenerating the signing link
7. WHEN an Ordinary_User regenerates a signing link, THE System SHALL display mobile-optimized sharing options
8. THE System SHALL automatically refresh contract status when user returns to the app
9. THE System SHALL send push notifications for important status changes (if enabled)

### Requirement 6: 签约状态管理（城市管理员）

**User Story:** As a City_Admin, I want to view and manage contract signing status, so that I can track the progress of all contracts.

#### Acceptance Criteria

1. WHEN a City_Admin visits the contract management page, THE System SHALL display a list of contracts belonging to their city
2. THE System SHALL support filtering contracts by status: 草稿, 待乙方签署, 待甲方签署, 已完成签署, 已拒签, 已过期
3. THE System SHALL support searching contracts by Party_B name or phone number
4. THE System SHALL support filtering contracts by date range
5. WHEN displaying contract list, THE System SHALL show: contract name, Party_B info, product name, status, creation time, last update time
6. WHEN a City_Admin clicks on a contract, THE System SHALL display detailed contract information including signing timeline
7. WHEN a contract status is "待乙方签署", THE System SHALL allow regenerating the signing link
8. WHEN Tencent E-Sign sends a callback notification, THE System SHALL update the contract status accordingly
9. THE System SHALL run a scheduled task to sync contract status from Tencent E-Sign API as a fallback
10. WHEN a contract is completed, THE System SHALL allow downloading the signed PDF document

### Requirement 4: 合同审批与甲方签署

**User Story:** As a City_Admin, I want to approve contracts after Party_B signs, so that Party_A can auto-sign and complete the contract.

#### Acceptance Criteria

1. WHEN Party_B completes signing, THE Contract status SHALL change to "待甲方签署"
2. WHEN a contract is in "待甲方签署" status, THE System SHALL display it in the approval queue
3. WHEN a City_Admin views a pending approval contract, THE System SHALL show Party_B's signed content for review
4. WHEN a City_Admin clicks "审批通过", THE System SHALL trigger Party_A auto-signing via Tencent E-Sign API
5. IF Party_A auto-signing succeeds, THEN THE Contract status SHALL change to "已完成签署"
6. WHEN a City_Admin clicks "审批拒绝", THE System SHALL update contract status and record rejection reason
7. THE System SHALL notify Party_B when contract is approved or rejected (if SMS notification is enabled)

### Requirement 5: 合同状态流转

**User Story:** As a System, I want to manage contract status transitions correctly, so that the signing workflow is properly enforced.

#### Acceptance Criteria

1. WHEN a contract is created but not submitted, THE Contract SHALL have status "草稿"
2. WHEN a contract is submitted and signing link is sent, THE Contract status SHALL change to "待乙方签署"
3. WHEN Party_B completes signing, THE Contract status SHALL change to "待甲方签署"
4. WHEN City_Admin approves and Party_A auto-signs successfully, THE Contract status SHALL change to "已完成签署"
5. IF Party_B rejects the contract, THEN THE Contract status SHALL change to "已拒签"
6. IF the signing link expires without Party_B signing, THEN THE Contract status SHALL change to "已过期"
7. IF City_Admin rejects the contract during approval, THEN THE Contract status SHALL change to "已拒签"
8. THE System SHALL NOT allow invalid status transitions
9. THE System SHALL record all status changes with timestamp and operator in audit log

### Requirement 6: 城市管理

**User Story:** As a System_Admin, I want to manage cities, so that I can organize contract data and assign administrators.

#### Acceptance Criteria

1. WHEN a System_Admin visits city management page, THE System SHALL display a list of all cities
2. WHEN a System_Admin creates a new city, THE System SHALL require city name and optional description
3. WHEN a System_Admin edits a city, THE System SHALL allow updating city name, description, and status
4. WHEN a System_Admin disables a city, THE System SHALL prevent new contracts from being created in that city
5. THE System SHALL support assigning multiple City_Admins to a city
6. THE System SHALL support configuring which products/templates are available for each city
7. WHEN displaying city list, THE System SHALL show contract statistics (total, pending, completed)

### Requirement 7: 产品与模板管理

**User Story:** As a System_Admin, I want to manage products and their associated contract templates, so that City_Admins can select appropriate contracts.

#### Acceptance Criteria

1. WHEN a System_Admin visits product management page, THE System SHALL display a list of all products
2. WHEN a System_Admin creates a product, THE System SHALL require product name, description, and Tencent E-Sign template ID
3. WHEN a System_Admin creates a product, THE System SHALL allow configuring form fields that need to be filled
4. WHEN a System_Admin edits a product, THE System SHALL allow updating product details and template binding
5. WHEN a System_Admin disables a product, THE System SHALL prevent it from being used in new contracts
6. THE System SHALL validate that template ID exists in Tencent E-Sign before saving
7. WHEN a City_Admin uploads a local template, THE System SHALL associate it with the city and sync to Tencent E-Sign

### Requirement 8: 用户管理

**User Story:** As a System_Admin, I want to manage user accounts, so that I can control access to the system.

#### Acceptance Criteria

1. WHEN a System_Admin visits user management page, THE System SHALL display a list of all administrators and ordinary users
2. WHEN a System_Admin creates a user, THE System SHALL require username, password, phone number, role, and city assignment (for City_Admin and Ordinary_User)
3. WHEN a System_Admin creates an Ordinary_User, THE System SHALL only require phone number, name, and city assignment
4. WHEN a System_Admin edits a user, THE System SHALL allow updating user details except username
5. WHEN a System_Admin resets a user's password, THE System SHALL generate a temporary password and require change on next login
6. WHEN a System_Admin disables a user, THE System SHALL prevent that user from logging in
7. THE System SHALL enforce password complexity rules (minimum 8 characters, mixed case, numbers) for Admin users
8. City_Admin SHALL only see and manage contracts within their assigned city
9. Ordinary_User SHALL only see and manage contracts they created
10. THE System SHALL support three user roles: System_Admin, City_Admin, Ordinary_User

### Requirement 9: 腾讯电子签API集成

**User Story:** As a System, I want to integrate with Tencent E-Sign API reliably, so that contract signing operations work correctly.

#### Acceptance Criteria

1. THE System SHALL securely store Tencent E-Sign API credentials (SecretId, SecretKey, UserId) in environment variables
2. WHEN calling Tencent E-Sign API, THE System SHALL properly sign requests according to Tencent Cloud API v3 signature method
3. THE System SHALL handle API rate limits (CreateFlowSignUrl: 20 requests/second)
4. WHEN API returns an error, THE System SHALL log the error details and return user-friendly error messages
5. THE System SHALL implement retry logic with exponential backoff for transient API failures
6. WHEN receiving callback notifications from Tencent E-Sign, THE System SHALL verify the callback signature
7. THE System SHALL store FlowId returned by CreateFlow for subsequent API calls
8. THE System SHALL handle the 30-minute expiration of signing links by allowing regeneration
9. THE System SHALL support auto-signing configuration for Party_A

### Requirement 10: 回调与状态同步

**User Story:** As a System, I want to receive and process signing status updates, so that contract status is always accurate.

#### Acceptance Criteria

1. THE System SHALL expose a callback endpoint for Tencent E-Sign notifications
2. WHEN receiving a callback, THE System SHALL verify the request signature before processing
3. WHEN receiving a "签署完成" callback for Party_B, THE System SHALL update contract status to "待甲方签署"
4. WHEN receiving a "流程完成" callback, THE System SHALL update contract status to "已完成签署"
5. WHEN receiving a "拒签" callback, THE System SHALL update contract status to "已拒签"
6. THE System SHALL run a scheduled task every 5 minutes to sync status for contracts in pending states
7. THE System SHALL log all callback events for debugging and audit purposes
8. IF callback processing fails, THEN THE System SHALL retry and alert administrators

### Requirement 11: 短信通知服务

**User Story:** As a System, I want to send SMS notifications, so that users are informed about signing requests and status changes.

#### Acceptance Criteria

1. THE System SHALL support sending signing link via SMS to Party_B
2. THE System SHALL support sending verification code via SMS for login
3. THE System SHALL use Tencent E-Sign's built-in SMS notification when available
4. IF Tencent E-Sign SMS is not available, THEN THE System SHALL use Tencent Cloud SMS service
5. THE System SHALL log all SMS sending attempts and results
6. THE System SHALL implement rate limiting for SMS sending (max 5 per phone per hour)
7. THE System SHALL support SMS template configuration

### Requirement 12: 数据持久化

**User Story:** As a System, I want to persist all contract and user data reliably, so that data is not lost and can be queried efficiently.

#### Acceptance Criteria

1. THE System SHALL store user accounts with bcrypt-encrypted passwords in MySQL database
2. THE System SHALL store contract records with all relevant metadata including FlowId
3. THE System SHALL store the mapping between products and Tencent E-Sign template IDs
4. THE System SHALL store city configuration and city-product relationships
5. WHEN a contract status changes, THE System SHALL record the change with timestamp in an audit log
6. THE System SHALL implement database indexes for frequently queried fields (status, city_id, created_at, party_b_phone)
7. THE System SHALL use database transactions for operations that modify multiple tables
8. THE System SHALL implement soft delete for contracts and users (mark as deleted instead of removing)

### Requirement 13: 数据统计与报表

**User Story:** As an Admin, I want to view contract statistics, so that I can understand business performance.

#### Acceptance Criteria

1. WHEN a City_Admin visits dashboard, THE System SHALL display statistics for their city
2. WHEN a System_Admin visits dashboard, THE System SHALL display statistics for all cities
3. THE System SHALL show: total contracts, pending contracts, completed contracts, rejection rate
4. THE System SHALL support viewing statistics by date range
5. THE System SHALL support exporting contract list to Excel format
6. THE System SHALL display trend charts for contract volume over time

### Requirement 15: 移动端界面优化

**User Story:** As an Ordinary_User, I want to use the system on mobile devices, so that I can manage contracts conveniently on the go.

#### Acceptance Criteria

1. WHEN an Ordinary_User accesses the system on mobile, THE System SHALL display a mobile-optimized interface
2. THE System SHALL provide separate entry points for mobile users and admin users
3. WHEN displaying forms on mobile, THE System SHALL use mobile-friendly input components and layouts
4. WHEN displaying lists on mobile, THE System SHALL use card-based layouts optimized for touch interaction
5. THE System SHALL support touch gestures for navigation (swipe, tap, long press)
6. WHEN displaying contract details on mobile, THE System SHALL use collapsible sections to save screen space
7. THE System SHALL optimize loading times for mobile networks
8. THE System SHALL support offline viewing of previously loaded contract data
9. THE System SHALL provide mobile-specific sharing options (WeChat, SMS, copy link)
10. THE System SHALL use responsive design to work on various mobile screen sizes

### Requirement 16: 系统安全

**User Story:** As a System, I want to ensure security, so that user data and contracts are protected.

#### Acceptance Criteria

1. THE System SHALL enforce HTTPS for all communications
2. THE System SHALL implement CSRF protection for all form submissions
3. THE System SHALL implement rate limiting for login attempts (max 5 per minute per IP)
4. THE System SHALL log all authentication events (login, logout, failed attempts)
5. THE System SHALL sanitize all user inputs to prevent XSS and SQL injection
6. THE System SHALL implement role-based access control (RBAC)
7. City_Admin SHALL NOT access data from other cities
8. THE System SHALL encrypt sensitive data at rest (API credentials, user passwords)
