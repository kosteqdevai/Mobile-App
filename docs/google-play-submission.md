# Google Play Submission Notes - Comero

This document contains paste-ready Google Play Console text for Comero and a short decision guide for account, upload, and business-registration questions.

## Upload device

You can upload the app from a PC. Google Play Console is a web dashboard, and the release artifact is uploaded from the browser.

You do not need to upload the app from a phone. A phone is still useful for:

- testing the installed app before review;
- creating screenshots for the store listing;
- completing Android device verification if Google asks for it on a new personal developer account.

For Google Play, upload an Android App Bundle (`.aab`), not the local debug APK documented in `docs/release.md`.

Current local Android package id:

```text
com.lacucina.app
```

Current visible app name:

```text
Comero
```

Do not change the package id casually. Google Play package names are permanent once published.

## Business registration question

Google Play allows both personal and organization developer accounts. A company is not required by Google just to publish through a personal developer account.

Use a personal developer account if you are publishing as an individual, hobbyist, student, or amateur developer.

Use an organization account if you are publishing for a company or organization. Google requires organization accounts for some categories and business contexts, and an organization account requires organization verification such as a D-U-N-S number.

Polish business/tax note: publishing a free app without monetization is usually different from running paid sales, subscriptions, ads, or in-app purchases. If Comero will earn revenue, be sold, show ads, process payments, or operate as a commercial service, ask an accountant or legal advisor whether you need `dzialalnosc gospodarcza`, tax registration, VAT handling, or consumer-law disclosures. This document is product/release guidance, not legal advice.

## App identity

App name:

```text
Comero
```

Default language suggestion:

```text
Polish (Poland)
```

App type:

```text
App
```

Pricing:

```text
Free
```

Category suggestion:

```text
Food & Drink
```

Contact email:

```text
[YOUR_SUPPORT_EMAIL]
```

Website:

```text
[YOUR_WEBSITE_OR_PRIVACY_POLICY_SITE]
```

## Main store listing - Polish

App name:

```text
Comero
```

Short description:

```text
Prywatny cookbook: przepisy, porcje i planer posilkow w jednym miejscu.
```

Full description:

```text
Comero to prywatny cookbook do codziennego gotowania. Zapisuj wlasne przepisy, porzadkuj je w cookbookach i kategoriach, przeliczaj skladniki na wybrana liczbe porcji i ukladaj proste plany posilkow na podstawie zapisanych przepisow.

Aplikacja jest zaprojektowana pod szybkie uzycie na telefonie: dodajesz przepis, zapisujesz skladniki i kroki, zmieniasz liczbe porcji, a Comero pokazuje przeliczone ilosci. Zapisane przepisy mozna oznaczac, filtrowac, archiwizowac i wykorzystywac w planowaniu posilkow.

Najwazniejsze funkcje:
- prywatna baza przepisow;
- skladniki, kroki, notatki, tagi i poziom trudnosci;
- przeliczanie skladnikow wedlug liczby porcji;
- cookbooki i kategorie do organizacji przepisow;
- planer posilkow oparty na zapisanych przepisach;
- tryb gotowania krok po kroku;
- eksport i import backupu przepisow jako plik JSON;
- lokalne przechowywanie danych bez konta.

Comero nie jest aplikacja medyczna ani dietetyczna. Dane o alergenach, kaloriach lub makroskladnikach, jesli zostana wpisane przez uzytkownika, maja charakter informacyjny i nie stanowia porady zdrowotnej.

W obecnej wersji Comero nie wymaga konta, nie publikuje przepisow publicznie, nie zawiera marketplace'u, subskrypcji ani social feedu.
```

## Main store listing - English optional

Short description:

```text
A private cookbook for recipes, servings, and simple meal planning.
```

Full description:

```text
Comero is a private cookbook app for everyday cooking. Save your own recipes, organize them into cookbooks and categories, scale ingredient quantities by servings, and build simple meal plans from the recipes you already use.

The app is designed for quick phone-first cooking workflows: add a recipe, save ingredients and steps, choose a target serving count, and see scaled quantities while cooking. Saved recipes can be tagged, filtered, archived, and reused in meal plans.

Core features:
- private recipe collection;
- ingredients, preparation steps, notes, tags, and difficulty level;
- serving-based ingredient scaling;
- cookbooks and categories for recipe organization;
- meal planning based on saved recipes;
- step-by-step cooking mode;
- recipe backup import and export as JSON;
- local data storage without an account.

Comero is not a medical or dietetic app. Allergen, calorie, or macronutrient information, if entered by the user, is informational only and is not health advice.

This version of Comero does not require an account, does not publish recipes publicly, and does not include a marketplace, subscriptions, or a social feed.
```

## Release notes

Production release notes:

```text
Pierwsza wersja Comero: prywatny cookbook, dodawanie i organizowanie przepisow, przeliczanie porcji, tryb gotowania, planer posilkow oraz lokalny backup/import przepisow.
```

Closed testing release notes:

```text
Wersja testowa Comero do sprawdzenia podstawowych przeplywow: dodawanie przepisow, przeliczanie porcji, organizacja cookbooka, planer posilkow, tryb gotowania i backup/import.
```

## App access

If Play Console asks whether Google needs special access:

```text
No special access required. Comero does not require login, account credentials, paid access, or server-side setup for review. The app can be opened and tested directly after installation.
```

## Content rating questionnaire guidance

Use the actual questionnaire in Play Console, but for the current Comero scope the expected answers should be:

```text
No violence.
No sexual content.
No gambling.
No user-generated public content.
No public social features.
No purchases in the app.
No ads.
No location sharing.
No account system.
```

If future versions add public publishing, social features, paid content, ads, or user accounts, redo the questionnaire.

## Target audience and content

Suggested target audience:

```text
18+
```

Rationale:

```text
Comero is designed as a practical personal cooking and meal-planning tool for adults. It is not designed specifically for children.
```

If you target users under 18, review Google Play Families and child-safety requirements first.

## Ads declaration

Current answer:

```text
No, this app does not contain ads.
```

## Data safety form draft

Important: verify this against the exact build before submitting. Data Safety must describe the app behavior and any third-party SDK behavior.

Current Comero scope:

```text
The app stores recipe, cookbook, planner, and optional local photo data locally on the user's device. It does not require an account and does not send this data to a Comero backend.
```

Suggested Data Safety answers for the current local-only build:

```text
Does the app collect or share user data?
No, if the release build does not transmit user-created recipe, planner, photo, account, device, analytics, advertising, or diagnostic data off the user's device.

Is all user data encrypted in transit?
Not applicable if no user data is transmitted off device.

Can users request data deletion?
The app stores data locally. Users can delete recipes in the app and can remove all local app data by clearing app storage or uninstalling the app. If Play Console requires a deletion URL, provide a simple support/privacy page explaining local deletion steps.

Does the app share data with third parties?
No, unless the user explicitly uses Android share/export actions. User-initiated sharing/export is controlled by the user.
```

If you add analytics, crash reporting, cloud sync, accounts, ads, push notifications, or external AI services later, this section must be changed before uploading that version.

## Privacy policy URL

Google Play requires a public privacy policy URL. Do not upload a PDF. Host this as a normal public web page.

Suggested URL placeholder:

```text
https://[YOUR_DOMAIN]/comero/privacy
```

Privacy policy text to host:

```text
Privacy Policy for Comero

Effective date: [DATE]

Comero is a private cookbook and meal-planning app. It helps users save recipes, organize cookbooks and categories, scale ingredient quantities by servings, cook from saved steps, and create simple meal plans.

Data stored by the app

Comero may store the following information on the user's device:
- recipe titles, descriptions, ingredients, quantities, units, and preparation steps;
- recipe notes, tags, categories, difficulty, timing, and favorites;
- user-entered allergen, calorie, or macronutrient notes if the user chooses to add them;
- cookbook and category organization;
- meal plan entries and serving overrides;
- optional local recipe photo data or photo references;
- backup/import data selected by the user.

No account required

Comero does not require users to create an account for the current version.

Local storage

The current version stores cookbook data locally on the user's device. Comero does not operate a backend account system for syncing recipes or meal plans.

Sharing and export

Users may choose to export or share recipe data through explicit app actions, such as backup export or Android share options. When users choose these actions, they control where the exported data is sent or saved.

Data deletion

Users can delete recipes and local cookbook content inside the app where deletion features are available. Users can also remove local app data by clearing the app's storage in Android settings or uninstalling the app. Uninstalling or clearing app storage may permanently remove local recipes unless the user previously exported a backup.

Health and nutrition disclaimer

Comero is not a medical, clinical nutrition, or dietetic service. Allergen, calorie, or macronutrient information entered by the user is informational only and should not be treated as medical advice or a guarantee that a recipe is safe for a specific diet or allergy.

Children

Comero is not designed specifically for children.

Contact

For privacy questions, contact:
[YOUR_SUPPORT_EMAIL]

Developer:
[YOUR_DEVELOPER_NAME_OR_COMPANY_NAME]
```

## Store assets checklist

Prepare these before production review:

```text
App icon: current Comero icon, Play Store size 512x512 PNG.
Feature graphic: 1024x500 PNG/JPG.
Phone screenshots: at least 2, recommended 4-8.
Suggested screenshots:
1. Recipe list / cookbook view.
2. Recipe details with serving scaling.
3. Recipe form or quick add.
4. Cook mode.
5. Meal planner.
6. Backup/import screen.
```

Avoid screenshots with fake personal data that looks real. Use clean sample recipes.

## Production artifact checklist

Before upload:

```text
npm run quality
npm run build
npx cap sync android
cd android
gradlew.bat bundleRelease
```

The Play Store upload artifact should be a release `.aab` from:

```text
android/app/build/outputs/bundle/release/
```

The current project does not document production signing yet. Do not commit keystores or passwords. Configure signing locally or through a secure CI secret store before uploading to Play Console.

## Review notes

Paste into review notes if needed:

```text
Comero can be tested without login. Open the app, create a recipe, add ingredients and steps, change the serving count on the recipe detail screen, add the recipe to a meal plan, open cook mode, and test backup/export from the backup screen. All cookbook data is local to the installed app.
```
