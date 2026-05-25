# PROJECT.md — LaCucina

## One-line concept

LaCucina to praktyczna, prosta i estetyczna aplikacja do przechowywania przepisów, organizowania własnego cookbooka, automatycznego przeliczania porcji oraz budowania elastycznych planów diety na podstawie zapisanych przepisów.

Długoterminowo LaCucina może rozwinąć się w system publikowania przepisów, cookbook twórcy, subskrypcję do cookbooka oraz marketplace recept, cookbooków lub planów żywieniowych.

## Current stage

Research and planning only.

Nie budować pełnej platformy, dopóki kierunek produktu i zakres MVP nie są wystarczająco doprecyzowane.

Pierwszy cel to walidacja podstawowej wartości:

```text
zapisz przepis -> uporządkuj go -> przelicz porcje -> gotuj szybciej -> użyj przepisu w planie diety
```

## Resolved MVP direction

Current planning decisions in `DECISIONS.md` set the first build direction as:

- Product direction: private personal cookbook first, not creator-first marketplace.
- First implementation target: web-first MVP for easier testing, with later conversion to mobile.
- Account model: no account; local owner only.
- Storage model: local-only device/browser storage.
- Public publishing: out of MVP.
- Web framework: React + Vite + TypeScript.

Application scaffold work should use React + Vite + TypeScript for the web-first MVP while keeping domain and application logic portable for later mobile conversion.

## Target platform and framework

The first implementation target is a web MVP optimized for smartphone-sized screens and local testing. The selected stack is React + Vite + TypeScript.

Rejected first-build platform options:

- Flutter or React Native are deferred until the web MVP validates the core loop.
- A public marketplace platform is out of MVP.
- Native iOS/Android builds are out of the first implementation pass.

## MVP platform guardrails

Resolved planning decisions keep the MVP narrow:

- No public recipe publishing in MVP.
- Sharing, if included, is limited to text export or a native share sheet.
- Recipe media is limited to one local photo per recipe.
- Calories, macros, subscriptions, marketplace, social feed, creator profiles, and Freak Mode stay out of MVP.
- Ownership, copyright, and moderation rules must be decided before any public publishing work starts.

Detailed guardrails live in [docs/future-platform-guardrails.md](docs/future-platform-guardrails.md).

## Implementation feedback direction

The latest implementation review recommends keeping LaCucina private and local-first while deepening practical kitchen workflows: richer recipe capture, grouped ingredients, cookable detail/export, guided cook mode, prep-ahead and leftovers guidance, weekly planning, shopping lists, and conservative allergen/nutrition metadata.

The next-build feedback plan lives in [docs/implementation-feedback-plan.md](docs/implementation-feedback-plan.md). It explicitly keeps public publishing, creator profiles, social feed, marketplace, subscriptions, backend sync, AI-first generation, and clinical diet advice out of the immediate scope.

The consolidated product ideas in `LaCucina_skonsolidowane_pomysly.md` refine the next local-first build with template recipes, simpler allergen and macro entry, a mobile-friendly quantity field, and a wider US/practical ingredient unit list. These ideas remain private, local-only, and non-clinical: Base Recipes are normal cookbook recipes marked as templates and import as independent copies, allergen fields are user-entered checkboxes where checked means contains, macro fields are manual B/T/W plus optional calories, and US units are selectable labels without automatic conversion.

## MVP implementation contract

Detailed MVP contracts:

- [MVP scope](docs/mvp-scope.md)
- [Data strategy](docs/data-strategy.md)
- [Privacy boundaries](docs/privacy.md)
- [Architecture contract](docs/architecture.md)

## Product direction

LaCucina ma obecnie dwa możliwe kierunki strategiczne:

### 1. Personal / creator cookbook

Aplikacja zaczyna jako prywatny system do zarządzania własnymi przepisami.

Później może umożliwiać:

- publikowanie wybranych przepisów,
- share'owanie cookbooka,
- udostępnianie przepisów jako content,
- sprzedaż dostępu lub subskrypcji do cookbooka.

### 2. Open recipe platform / marketplace

Aplikacja może stać się platformą, gdzie wielu użytkowników tworzy, publikuje, udostępnia i potencjalnie monetyzuje przepisy, cookbooki albo plany diety.

### Aktualna rekomendacja

MVP nie powinno próbować od razu obsłużyć obu kierunków w pełni.

Najlepszy pierwszy kierunek:

```text
mocny prywatny cookbook + przeliczanie porcji + proste planowanie diety
```

Dopiero później:

```text
publikowanie -> cookbook twórcy -> subskrypcje -> marketplace
```

## Target users

Główna grupa użytkowników:

- ludzie, którzy gotują,
- osoby gotujące codziennie albo kilka razy w tygodniu,
- osoby, które nie chcą pamiętać przepisów z głowy,
- osoby, które często muszą przeliczać porcje,
- osoby początkujące,
- osoby średnio zaawansowane.

Przyszłe / drugorzędne grupy użytkowników:

- osoby zaawansowane, które chcą większej kontroli nad parametrami przepisu,
- osoby tworzące kulinarny content,
- osoby budujące dietę wokół własnych przepisów,
- osoby, które chcą obserwować lub subskrybować cookbook innej osoby.

## User cooking context

Założenia o użytkowniku:

- użytkownik ma minimum około 10 minut na gotowanie,
- użytkownik gotuje codziennie albo kilka razy w tygodniu,
- liczba osób, dla których gotuje, może się zmieniać,
- użytkownik może gotować sam, dla pary, rodziny albo elastycznej liczby osób,
- użytkownik potrzebuje prostego systemu, który nie przeszkadza w samym gotowaniu.

## Core problems

LaCucina ma rozwiązywać następujące problemy:

- przepisy są trudne do zapamiętania,
- przepisy są rozproszone po notatkach, pamięci, screenshotach, social mediach albo dokumentach,
- ręczne przeliczanie porcji jest irytujące i podatne na błędy,
- planowanie diety na podstawie własnych przepisów jest trudne bez centralnego systemu,
- użytkownik chce mieć elastyczne opcje diety, a nie tylko sztywny jadłospis,
- share'owanie przepisów i cookbooka nie jest scentralizowane,
- przepisy mogą z czasem stać się nową formą content creatingu.

## Product goals

Aplikacja powinna pomagać w osiągnięciu tych efektów:

- szybsze gotowanie,
- brak potrzeby pamiętania przepisów,
- łatwe przeliczanie porcji,
- centralna kontrola nad własnymi przepisami,
- centralna kontrola nad dietą,
- elastyczne planowanie posiłków,
- możliwość rozwinięcia produktu w kierunku share'owania, publikowania i monetyzacji cookbooka.

## Product style

LaCucina powinna być:

- praktyczna,
- prosta,
- estetyczna,
- przyjazna dla początkujących,
- wystarczająco mocna dla średnio zaawansowanych,
- możliwa do rozbudowania w stronę platformy albo marketplace recept.

Domyślny interfejs powinien być prosty. Zaawansowane opcje nie powinny przytłaczać casualowych użytkowników.

## Core loop hypothesis

Podstawowy loop aplikacji:

```text
dodaj przepis -> przypisz do cookbooka/kategorii -> przelicz porcje -> gotuj -> użyj w planie diety -> opcjonalnie udostępnij lub opublikuj
```

Loop planowania diety:

```text
wybierz przepisy -> przypisz do dnia/tygodnia/miesiąca/template'u -> ustaw porcje -> powtarzaj plan albo loop -> gotuj z planu
```

Przyszły loop twórcy:

```text
stwórz przepis -> dodaj zdjęcie/short -> opublikuj -> buduj cookbook -> share'uj -> zdobywaj obserwujących lub subskrybentów
```

## Current known product mechanics

- Użytkownik może przechowywać własne przepisy.
- Przepisy powinny obsługiwać automatyczne przeliczanie porcji.
- Przepisy powinny być organizowane przez kategorie, zakładki albo cookbooki.
- Zapisane przepisy powinny być używalne w planach diety.
- Plany diety powinny docelowo wspierać widok tygodniowy, miesięczny i customowe pętle.
- Przykładowe pętle: training day / non-training day.
- Użytkownik może docelowo publikować własne przepisy.
- Użytkownik może docelowo dodawać zdjęcia i shorty potraw.
- Użytkownik może docelowo share'ować przepisy lub całe cookbooki.
- Użytkownik może docelowo oferować subskrypcję do swojego cookbooka.
- Możliwy jest przyszły marketplace recept, cookbooków albo planów diety.
- Możliwy jest przyszły tryb zaawansowany: **Freak Mode**.

## MVP recommendation

MVP powinno najpierw udowodnić, że LaCucina działa jako osobisty system do przepisów i planowania, zanim stanie się platformą do publikowania.

Rekomendowany pierwszy build:

```text
Personal cookbook MVP z CRUD przepisów, kategoriami, automatycznym przeliczaniem porcji i prostym planerem tygodniowym albo training/non-training.
```

## MVP must include

- Dodawanie przepisu.
- Edycja przepisu.
- Usuwanie przepisu.
- Podgląd szczegółów przepisu.
- Składniki z ilościami i jednostkami.
- Kroki przygotowania.
- Bazowa liczba porcji dla przepisu.
- Automatyczne przeliczanie składników po zmianie liczby porcji.
- Organizowanie przepisów w kategorie, zakładki albo cookbooki.
- Wyszukiwanie lub filtrowanie przepisów po nazwie/kategorii.
- Proste planowanie posiłków na podstawie zapisanych przepisów.
- Minimum jeden prosty format planowania:
  - plan tygodniowy,
  - customowy template dnia,
  - training day / non-training day.

## MVP should probably include

- Notatki do przepisu.
- Tagi przepisu.
- Szacowany czas przygotowania.
- Poziom trudności: beginner / intermediate.
- Ulubione przepisy.
- Proste share'owanie, nawet jeśli tylko przez prywatny link albo eksport tekstu.

## MVP should not include yet

- Pełny publiczny marketplace.
- Płatne subskrypcje cookbooków.
- Pełne profile twórców.
- Rozbudowany system zdjęć i shortów.
- Social feed.
- Zaawansowana moderacja.
- Duży publiczny katalog przepisów.
- Zbyt złożony system diety przed walidacją podstaw: przepisy, porcje, planowanie.
- Freak Mode jako domyślne doświadczenie.

## Future features

### Recipe media

Docelowo przepis może mieć:

- zdjęcie potrawy,
- galerię zdjęć,
- short/wideo,
- media pokazane na ekranie szczegółów przepisu,
- media używane później w publicznym profilu albo feedzie.

### Publishing

Docelowe publikowanie może obejmować:

- publikowanie wybranych przepisów,
- zachowanie innych przepisów jako prywatnych,
- share'owanie przepisu linkiem,
- publiczny cookbook,
- profil autora,
- obserwowanie cookbooka albo twórcy.

### Subscriptions and monetization

Możliwe ścieżki monetyzacji:

- płatny dostęp do cookbooka właściciela,
- subskrypcja premium recipes,
- płatne plany diety,
- płatne cookbooki twórców,
- prowizja marketplace od sprzedaży cookbooków albo planów.

Monetyzacja nie powinna być częścią pierwszego MVP, chyba że kierunek creator-first zostanie wybrany jako priorytet.

### Marketplace

Możliwy marketplace może obejmować:

- publikowanie przepisów przez użytkowników,
- sprzedaż albo darmowe udostępnianie cookbooków,
- sprzedaż planów diety zbudowanych na przepisach,
- odkrywanie twórców,
- subskrypcje twórców.

Marketplace jest funkcją późniejszą, a nie bazą pierwszej wersji.

### Freak Mode

Freak Mode to opcjonalny zaawansowany tryb UI dla bardziej zaawansowanych użytkowników.

Potencjalne funkcje Freak Mode:

- bardziej szczegółowe parametry składników,
- precyzyjniejsze sterowanie porcjami,
- pola kalorii i makro,
- notatki technologiczne,
- batch cooking,
- ustawienia training day / non-training day,
- bardziej złożone ustawienia planu diety,
- dodatkowe parametry przepisu ukryte przed początkującymi.

Normalny interfejs powinien pozostać prosty i przyjazny.

## Recipe model

Każdy przepis powinien docelowo wspierać:

- ID,
- tytuł,
- opis,
- przypisanie do cookbooka,
- kategorię albo zakładkę,
- tagi,
- bazową liczbę porcji,
- składniki,
- ilości składników,
- jednostki składników,
- kroki przygotowania,
- czas przygotowania,
- czas gotowania,
- poziom trudności,
- notatki,
- opcjonalne zdjęcie,
- opcjonalny short/wideo,
- widoczność:
  - private,
  - shared by link,
  - public,
- autora/właściciela,
- datę utworzenia,
- datę ostatniej edycji.

## Ingredient and portion scaling model

Każdy składnik powinien mieć:

- nazwę składnika,
- ilość,
- jednostkę,
- opcjonalną notatkę,
- opcjonalną kategorię.

Przeliczanie porcji powinno działać według logiki:

```text
przeliczona ilość = oryginalna ilość składnika * docelowa liczba porcji / bazowa liczba porcji
```

Przykład:

```text
Bazowy przepis: 2 porcje
Składnik: 200 g ryżu
Docelowo: 6 porcji
Wynik: 600 g ryżu
```

System powinien zachowywać bazowy przepis i dynamicznie liczyć wartości dla wybranej liczby porcji.

## Cookbook and category model

Aplikacja powinna wspierać strukturę podobną do cookbooka.

Proponowana struktura:

```text
User
  -> Cookbooks
      -> Categories / Tabs
          -> Recipes
```

Przykładowe kategorie:

- Breakfast,
- Lunch,
- Dinner,
- Snacks,
- Training day,
- Non-training day,
- Quick meals,
- High protein,
- Family meals,
- Beginner recipes,
- Advanced recipes.

Struktura kategorii powinna być elastyczna, bo użytkownik chce własnych zakładek i własnego porządku cookbooka.

## Meal and diet planning

Przepisy powinny być building blocks dla planów diety.

Docelowe typy planów:

- plan dzienny,
- plan tygodniowy,
- plan miesięczny,
- custom loop plan,
- training day / non-training day plan.

Ważne założenie:

LaCucina nie powinna obsługiwać tylko kalendarzowego planowania. Powinna też obsługiwać template'y i powtarzalne pętle.

Przykład pętli:

```text
Loop A:
Day 1: Training Day
Day 2: Non-Training Day
Day 3: Training Day
Day 4: Non-Training Day
Repeat
```

Każdy wpis w planie powinien wskazywać na zapisany przepis i pozwalać zmienić liczbę porcji.

## User roles

### Guest

Potencjalne uprawnienia:

- widok publicznych przepisów, jeśli publikowanie istnieje,
- preview konceptu aplikacji.

### User

Potencjalne uprawnienia:

- tworzenie prywatnych przepisów,
- edycja własnych przepisów,
- organizowanie cookbooków i kategorii,
- przeliczanie porcji,
- budowanie planów posiłków,
- share'owanie wybranych przepisów,
- publikowanie przepisów, jeśli funkcja jest włączona.

### Creator

Przyszła rola, jeśli aplikacja pójdzie w stronę publikowania:

- publiczny profil,
- publiczny cookbook,
- opublikowane przepisy,
- przepisy tylko dla subskrybentów,
- zdjęcia i shorty,
- podstawowa analityka.

### Admin

Przyszła rola, jeśli aplikacja stanie się platformą:

- moderowanie publicznych przepisów,
- zarządzanie użytkownikami,
- zarządzanie zgłoszeniami,
- zarządzanie marketplace content,
- zarządzanie subskrypcjami albo dostępem do płatnych cookbooków.

## UX principles

- Domyślnie prosty interfejs.
- Szybkie dodawanie przepisu.
- Bardzo czytelne przeliczanie porcji.
- Kategorie i cookbooki muszą być łatwe do zrozumienia.
- Początkujący użytkownik nie powinien widzieć zbyt wielu parametrów.
- Zaawansowane parametry powinny być schowane w Freak Mode.
- Aplikacja ma być projektowana pod regularne używanie, a nie jednorazowe przeglądanie.
- Flow gotowania powinien być ważniejszy niż efektowność UI.

## First user experience hypothesis

Nowy użytkownik powinien szybko zrozumieć aplikację przez taki flow:

```text
stwórz pierwszy przepis -> ustaw bazowe porcje -> dodaj składniki -> zmień liczbę porcji -> zobacz automatyczne przeliczenie -> zapisz do cookbooka
```

Silniejszy flow MVP:

```text
stwórz przepis -> przelicz porcje -> dodaj do planu weekly albo training/non-training -> gotuj z zapisanego przepisu
```

## MVP constraints

- Nie zaczynać od pełnego publicznego marketplace.
- Nie zaczynać od subskrypcji, dopóki kierunek creator-first nie jest potwierdzony.
- Nie zaczynać od pełnego systemu shortów i social contentu.
- Nie komplikować planowania diety przed dobrym działaniem bazy przepisów.
- Nie robić Freak Mode jako domyślnego UI.
- Pierwsza wersja ma skupić się na przepisach, organizacji, porcjach i prostym planowaniu.

## MVP success criteria

MVP jest sukcesem, jeśli użytkownik może regularnie przejść przez loop:

```text
zapisz przepis -> znajdź przepis -> przelicz porcje -> ugotuj -> użyj ponownie w planie
```

Dodatkowe sygnały sukcesu:

- użytkownik dodaje wiele przepisów bez frustracji,
- użytkownik używa przeliczania porcji zamiast ręcznej matematyki,
- użytkownik tworzy kategorie lub cookbooki pasujące do swojego stylu gotowania,
- użytkownik używa tych samych przepisów w planach,
- użytkownik chce share'ować lub publikować przepisy po użyciu prywatnego systemu.

## Possible metrics

- Liczba dodanych przepisów.
- Liczba edycji przepisów.
- Liczba przeliczeń porcji.
- Liczba przepisów dodanych do planu.
- Liczba powrotów do tego samego przepisu.
- Liczba share'owanych przepisów.
- Liczba publicznych przepisów, jeśli publikowanie istnieje.
- Liczba utworzonych cookbooków.
- Tygodniowa aktywność użytkownika.

## Open product questions

- Czy LaCucina jest najpierw prywatnym cookbookiem, cookbookiem twórcy, czy otwartą platformą?
- Czy MVP ma być web, mobile czy PWA?
- Czy MVP wymaga kont użytkowników?
- Czy przepisy mają być prywatne domyślnie?
- Jaka jest minimalna użyteczna wersja planowania posiłków?
- Czy weekly planner ma być w MVP?
- Czy training/non-training templates mają być w MVP?
- Czy monthly planner powinien poczekać?
- Czy kalorie i makro mają być w pierwszej wersji?
- Co dokładnie ma odblokowywać Freak Mode?
- Czy share'owanie ma być prostym linkiem, czy pełnym publicznym publikowaniem?
- Czy subskrypcje powinny wejść wcześnie, czy dopiero po walidacji cookbooka?
- Jak rozwiązać ownership i copyright przy publikowanych przepisach?
- Czy aplikacja ma startować tylko z cookbookiem właściciela, czy z wieloma użytkownikami?
- Jakiej moderacji potrzeba, jeśli użytkownicy mogą publikować przepisy?
- Czy zdjęcia powinny być przed publicznym publikowaniem?
- Czy shorty są dokumentacją przepisu, czy social contentem?

## Immediate next decisions

Przed implementacją trzeba zdecydować:

1. Platforma MVP: web, mobile czy PWA.
2. Model kont: brak konta, proste konto czy pełne auth.
3. Minimalne pola przepisu.
4. Minimalna struktura kategorii/cookbooka.
5. Pierwszy typ planu: weekly, custom loop czy training/non-training.
6. Czy share'owanie istnieje w MVP.
7. Czy publikowanie istnieje w MVP.
8. Czy Freak Mode jest tylko future concept, czy wczesny toggle.

## Recommended first build scope

Rekomendowany pierwszy zakres:

```text
Personal cookbook MVP z tworzeniem i edycją przepisów, kategoriami, automatycznym przeliczaniem porcji oraz prostym planerem weekly albo training/non-training.
```

Rekomendowana dalsza rozbudowa:

```text
zdjęcia -> shorty -> publiczne share'owanie -> creator cookbook -> subskrypcje -> marketplace
```
