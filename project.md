# BakeBook — Build 3 Project Plan

## Project Overview

BakeBook is a private and public recipe journal where users can sign up, save recipes, upload food photos, share baking creations, and communicate with other bakers.

Build 3 will improve BakeBook by adding moderation, administrator controls, stronger database security, privacy features, and real-time messaging while keeping all Build 2 features.

The existing GitHub repository and Supabase project will be used. This is an upgrade, not a new project.

## 1. New Database Tables

The following tables will be added after checking the existing database:

- **moderators:** Stores the user IDs of approved moderators.
- **admins:** Stores the user IDs of administrators.
- **reports:** Stores reports submitted by users against recipes or other users, including the reason and reporting user.
- **hidden_recipes:** Records recipes hidden by moderators or admins.
- **moderation_log:** Records moderation actions, including who performed the action and when.
- **blocked_users:** Stores accounts blocked by administrators.
- **conversations:** Stores private messaging conversations.
- **conversation_members:** Identifies the users participating in each conversation.
- **messages:** Stores messages, their senders, conversation IDs, and timestamps.

Existing tables:

- **profiles:** Stores user IDs, usernames, and profile information.
- **recipes:** Stores recipes, ingredients, instructions, photos, visibility, and ownership.

Roles will never be stored in the profiles table.

## 2. Permissions

### Normal Users
- Create, edit, and delete their own recipes.
- View public recipes and their own private recipes.
- Report recipes and other users.
- Send and receive private messages.
- Cannot view private reports or moderation controls.
- Cannot make themselves moderators or admins.
- Cannot change another user's recipes or delete their files.

### Moderators
- View and review reports.
- Hide or remove any user's recipes.
- Remove associated recipe photos.
- Cannot edit another user's recipe content.
- Cannot add or remove moderators.
- Cannot create or manage administrators.

### Admins
- Access the admin panel.
- Add and remove moderators.
- View and manage reports.
- Hide and remove recipes.
- Block and unblock users from posting.
- Review the moderation log.
- Cannot create new administrators through the app.

### App Owner
- Adds administrators directly through the Supabase dashboard.
- Maintains control over administrator permissions.

## 3. Moderation and Reporting

### Recipe Reporting
Users can report recipes using a Report button.

Possible reasons:
- Spam.
- Inappropriate content.
- Offensive content.
- Other.

### User Reporting
Users can report other profiles.

Possible reasons:
- Spam.
- Harassment or bullying.
- Inappropriate behavior.
- Other.

Reports can include an optional explanation.

Only moderators and admins can view submitted reports.

### Moderation Actions
- Moderators and admins can hide recipes.
- Hiding a recipe creates a row in hidden_recipes instead of adding a hidden column to recipes.
- Moderators and admins can permanently remove inappropriate recipes and their associated files.
- Users can remove their own recipes and associated files.
- Moderation actions are recorded in moderation_log.

## 4. Admin Panel and Blocking

The admin panel will only be accessible to administrators.

Admins can:
- Add moderators.
- Remove moderators.
- View reports.
- Block users from posting.
- Unblock users.
- Review moderation history.

Blocked users cannot create new recipes.

Blocking must be enforced using Supabase RLS policies, not just by hiding website buttons.

## 5. Real-Time Messaging

BakeBook will include a private one-to-one messaging system.

Features:
- Conversations inbox.
- Start conversations with other BakeBook users.
- Send and receive messages in real time.
- View previous messages.
- Display message timestamps.
- Show unread message indicators.
- Private conversations accessible only to their participants.
- Responsive messaging interface for desktop and mobile.

Supabase Realtime will be used for live message updates.

## 6. Privacy and Account Management

- A plain-language privacy policy explaining what information BakeBook saves, who can see it, and how users can delete it.
- Privacy policy linked from every page.
- Delete my data button.
- Delete confirmation before destructive actions.
- Deletion of the user's associated database records and uploaded files.
- Secure handling of account deletion and related authentication records.

## 7. User Experience and Professional Extras

1. Reserved usernames: Prevent usernames such as admin, administrator, moderator, and mod.
2. Page title and custom favicon.
3. Confirmation messages before deleting recipes, messages, or account data.
4. Clear loading, empty, success, and error messages.
5. Alt text for uploaded images.
6. Labels for all form fields.
7. Mobile-friendly responsive design.
8. Dark mode that remembers each user's preference.
9. Badges next to moderator and admin usernames.

## 8. Security

- Enable Row Level Security (RLS) on all relevant tables.
- Use separate tables for moderators and admins.
- Only admins can add or remove moderators.
- Admins can only be added through the Supabase dashboard.
- Users can only edit their own recipes.
- Moderators can hide or remove recipes but cannot edit their content.
- Reports are only accessible to moderators and admins.
- Messaging is restricted to conversation participants.
- Blocked users cannot create new recipes.
- Storage files have separate security policies.
- Users cannot delete or modify other users' files.
- Test permissions using four accounts: one admin, one moderator, and two normal users.

## 9. Testing

Test all permissions using four separate accounts.

### Normal Users
- Cannot access other users' private recipes.
- Cannot make themselves moderators or admins.
- Cannot change or delete other users' recipes.
- Cannot delete files belonging to other users.
- Can report recipes and users.
- Can send private messages to other users.

### Moderators
- Can view reports.
- Can hide and remove recipes.
- Can remove associated recipe files.
- Cannot edit another user's recipe content.
- Cannot add moderators or administrators.

### Admins
- Can access the admin panel.
- Can add and remove moderators.
- Can block and unblock users.
- Can view moderation logs.
- Cannot create administrators from inside the app.

### General Testing
- Users can delete their own recipes and files.
- Blocked users cannot create new recipes.
- Reports remain private.
- Messages remain private to conversation participants.
- Dark mode preference is remembered.
- Account deletion removes the appropriate user data and files.
- All Build 2 features continue working.

Every test will record the account used, the action attempted, and the result.

## 10. Existing Features to Keep

- Email and password authentication.
- GitHub login.
- Unique usernames.
- Private and public recipes.
- Recipe ingredients and baking instructions.
- Food photo uploads.
- User profiles.
- Session retention after refreshing.

## 11. Final Goal

Complete Build 3 by making BakeBook secure, professional, user-friendly, and ready to share.

All required features must work, all security permissions must be tested, and all Build 2 features must continue functioning.

The final submission will include an updated README, a handwritten explanation, a handwritten database security diagram, and completed testing records.
