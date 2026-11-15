
# BakeBook — Build 3 Project Plan

## Project Overview

BakeBook is a private and public recipe journal where users can sign up, save recipes, upload food photos, and share their baking creations.

Build 3 will add moderation, admin controls, stronger security, and improved privacy while keeping all Build 2 features.

## 1. New Database Tables

- moderators: Stores the user IDs of approved moderators.
- admins: Stores the user IDs of administrators.
- reports: Stores reports submitted by users, including the recipe, reason, and reporting user.
- hidden_recipes: Stores recipes hidden by moderators or admins.

Roles will not be stored in the profiles table.

## 2. Permissions

### Normal Users
- Create, edit, and delete their own recipes.
- View public recipes.
- Report other users' recipes.
- Cannot access reports or moderation controls.
- Cannot make themselves moderators or admins.

### Moderators
- View reports.
- Hide or remove other users' recipes and uploaded files.
- Cannot edit other users' recipes.
- Cannot add moderators or admins.

### Admins
- Access the admin panel.
- Add and remove moderators.
- Hide and remove recipes.
- View reports.
- Cannot create new admins through the app.

### App Owner
- Adds admins directly through the Supabase dashboard.

## 3. New Features

1. Admin panel for managing moderators.
2. Report button on public recipes.
3. Moderation tools to hide or remove inappropriate recipes.
4. Delete my data button to remove a user's data and uploaded files.
5. Privacy policy explaining stored information, visibility, and deletion.
6. Dark mode that remembers each user's preference.
7. Users can delete their own recipes and uploaded files.

## 4. Professional Extras

1. Confirmation messages before deleting recipes or data.
2. Clear loading, empty, success, and error messages.
3. Alt text for uploaded images and labels for form fields.
4. A page title and favicon.

## 5. Security

- Enable Row Level Security (RLS) on all relevant tables.
- Use separate tables for moderators and admins.
- Only admins can add or remove moderators.
- Admins can only be added through the Supabase dashboard.
- Users can only edit their own recipes.
- Moderators can hide or remove recipes but cannot edit their content.
- Storage files must have separate security policies.
- Test permissions using four accounts: one admin, one moderator, and two normal users.

## 6. Testing

Test all permissions using four separate accounts.

- Normal users cannot access other users' private recipes.
- Normal users cannot make themselves moderators or admins.
- Moderators can hide and remove recipes.
- Moderators cannot edit other users' recipes.
- Admins can manage moderators.
- Users can delete their own recipes and files.
- Reports are only visible to moderators and admins.
- All Build 2 features continue working.

## 7. Existing Features to Keep

- Email and password authentication.
- GitHub login.
- Unique usernames.
- Private and public recipes.
- Recipe ingredients and baking instructions.
- Food photo uploads.
- User profiles.
- Session retention after refreshing.

## 8. Final Goal

Complete Build 3 by making BakeBook secure, user-friendly, and ready to share. All permissions must be tested before publishing.
