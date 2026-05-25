# LaCucina — skonsolidowane pomysły

## 1. Base Recipes / moduły przepisów

### Problem
Użytkownik nie powinien musieć dodawać tego samego fragmentu przepisu wielokrotnie, np. tego samego ciasta na pierogi w każdym wariancie pierogów.

### Pomysł
Wprowadzić koncepcję **Base Recipes**, czyli bazowych komponentów przepisu, które można tworzyć raz i później importować do innych przepisów.

Przykład:
- pełny przepis: **Pierogi z grzybami**
- oznaczony komponent wewnątrz przepisu: **ciasto na pierogi**
- później przy tworzeniu innego przepisu, np. **pierogi ruskie**, użytkownik może zaimportować gotowy komponent **ciasto na pierogi** zamiast przepisywać tę część od nowa.

### Funkcjonalność
- Możliwość oznaczenia części istniejącego przepisu jako komponent bazowy.
- Możliwość zapisania komponentu jako osobnego, reużywalnego elementu.
- Możliwość importowania komponentu bazowego do nowego przepisu.
- Komponent powinien zachowywać składniki, kroki, czas przygotowania oraz ewentualne notatki.
- Komponent może być używany w wielu przepisach.

### Decyzje produktowe do rozważenia
- Czy Base Recipe ma być osobnym typem przepisu, czy tylko tagiem/sekcją wewnątrz przepisu?
- Czy zmiana komponentu bazowego powinna automatycznie aktualizować wszystkie przepisy, które go używają?
- Czy użytkownik powinien mieć opcję: „zaktualizuj globalnie” vs „skopiuj jako niezależną wersję”?
- Czy komponenty mogą być zagnieżdżone, np. ciasto → farsz → sos?

### Wartość dla użytkownika
- Mniej duplikacji.
- Szybsze tworzenie przepisów.
- Lepsza kontrola nad powtarzalnymi elementami kuchni.
- Łatwiejsze skalowanie cookbooka i planów dietetycznych.

### Potencjalna nazwa w aplikacji
- Base Recipes
- Komponenty przepisu
- Moduły przepisu
- Elementy bazowe
- Recipe Blocks

### Status
Pomysł zaakceptowany jako ważny element architektury aplikacji.

---

## 2. Alergeny — uproszczony model danych i UI

### Problem
Nie ma sensu tworzyć osobnego wiersza ani osobnego formularza dla każdego alergenu. To byłoby ciężkie w użyciu, powtarzalne i mało praktyczne przy codziennym dodawaniu przepisów.

### Pomysł
Zamiast oddzielnych pól/formularzy dla każdego alergenu, aplikacja powinna mieć **jedną skonsolidowaną tabelę alergenów**, gdzie użytkownik może szybko zaznaczać obecność lub brak alergenu.

Przykład UI:
- gluten
- mleko / laktoza
- jajka
- orzechy
- soja
- ryby
- skorupiaki
- sezam

Przy każdym alergenie użytkownik może zaznaczyć status.

### Proponowany status alergenu
- **unverified** — aplikacja nie wie jeszcze, czy przepis zawiera alergen.
- **verified** — alergen został sprawdzony / potwierdzony w ramach przepisu.

### Decyzja: usunąć „user verified”
Tag **user verified** wydaje się zbędny, ponieważ nie wnosi wystarczająco dużo wartości ponad zwykłe **verified**. Jeśli użytkownik sam sprawdza przepis, to nadal końcowym stanem powinno być po prostu **verified**.

### Uproszczona logika
Dla każdego przepisu alergeny mogą mieć status:
- zawiera alergen,
- nie zawiera alergenu,
- niezweryfikowane.

To jest bardziej użyteczne niż mnożenie tagów typu „user verified”, „system verified”, „manual verified” itd.

### Wartość dla użytkownika
- Szybsze dodawanie przepisów.
- Mniej klikania.
- Czytelniejszy widok bezpieczeństwa żywieniowego.
- Łatwiejsze filtrowanie przepisów pod diety i ograniczenia.

### Decyzje produktowe do rozważenia
- Czy aplikacja powinna automatycznie sugerować alergeny na podstawie składników?
- Czy użytkownik powinien móc ręcznie nadpisać sugestię aplikacji?
- Czy status „verified” powinien oznaczać sprawdzenie całego przepisu, czy konkretnego alergenu?
- Czy przy publikowanych przepisach trzeba pokazywać ostrzeżenie typu: „alergeny wymagają samodzielnej weryfikacji”?

### Status
Pomysł zaakceptowany jako uproszczenie modelu alergenów i formularza dodawania przepisu.

---

## 3. Bug: pole quantity nie usuwa poprawnie wartości `0` na telefonie

### Problem
Przy dodawaniu ilości składnika pole **quantity** domyślnie zawiera `0`. Na telefonie użytkownik musi ręcznie zaznaczyć wartość `0`, żeby ją zastąpić, albo dopisać nową liczbę przed zerem. W przeciwnym razie nie da się wygodnie usunąć zera i wpisać poprawnej ilości.

### Przykład problemu
Użytkownik chce wpisać ilość `250`, ale pole startuje jako `0`.

Obecne zachowanie może prowadzić do sytuacji typu:
- użytkownik dopisuje liczbę i dostaje `0250`,
- użytkownik nie może łatwo usunąć `0`,
- na telefonie trzeba dodatkowo zaznaczać tekst, co spowalnia dodawanie składników.

### Oczekiwane zachowanie
Pole quantity powinno być łatwe do nadpisania od razu po wejściu w input.

Rekomendowane rozwiązania:
- zamiast domyślnego `0`, używać pustego pola z placeholderem, np. `0`, `ilość` albo `np. 250`,
- po focusie na pole automatycznie zaznaczać całą obecną wartość,
- jeśli wartość wynosi `0` i użytkownik zaczyna pisać, pierwsza wpisana cyfra powinna zastąpić `0`, a nie dopisać się obok,
- walidację `required` / `must be greater than 0` robić dopiero przy zapisie, a nie przez wymuszanie startowego `0`.

### Decyzja produktowo-techniczna
Preferowane rozwiązanie: **quantity input powinien startować jako pusty string w UI**, a nie jako liczba `0`. Dopiero przy zapisie/parsingowaniu aplikacja powinna konwertować wartość na liczbę i walidować, czy jest poprawna.

### Wartość dla użytkownika
- Szybsze dodawanie składników na telefonie.
- Mniej frustracji przy edycji ilości.
- Lepsze UX dla mobile-first workflow.
- Mniejsze ryzyko błędnych wartości typu `0250`.

### Status
Bug zaakceptowany jako poprawka UX/input handling dla formularza składników.

---

## 4. Makroskładniki — uprościć status/source i rozbić na mniejsze pola

### Problem
Pola typu **status** i **source** przy makroskładnikach wydają się zbędne lub zbyt ciężkie jak na praktyczne użycie. Dla użytkownika ważniejsze jest szybkie wpisanie lub sprawdzenie wartości makro niż zarządzanie metadanymi typu źródło i status.

### Pomysł
Zamiast rozbudowanego modelu z dodatkowymi polami **status/source**, makroskładniki powinny być przedstawione prościej — jako kilka małych, bezpośrednich pól.

### Proponowany kierunek UI
Zamiast jednego rozbudowanego obiektu/formularza dla makro, użyć **3 mniejszych pól**, np.:
- białko,
- tłuszcze,
- węglowodany.

Opcjonalnie kalorie mogą być:
- osobnym czwartym polem,
- albo wartością wyliczaną automatycznie z makro.

### Decyzja: status/source przy macro raczej usunąć
Na tym etapie pola **status** i **source** przy makro nie mają wystarczającej wartości użytkowej. Mogą komplikować UI i bazę danych bez realnej korzyści w codziennym dodawaniu przepisów.

### Uproszczona logika
Dla przepisu lub porcji wystarczy przechowywać podstawowe wartości makro:
- protein / białko,
- fat / tłuszcz,
- carbs / węglowodany,
- ewentualnie calories / kalorie.

Jeżeli w przyszłości aplikacja będzie importowała dane z zewnętrznych baz żywieniowych, źródło danych można dodać później jako metadane importu, a nie jako widoczne pole użytkownika przy każdym makro.

### Wartość dla użytkownika
- Mniej pól do wypełnienia.
- Szybsze dodawanie przepisu.
- Prostszy mobile UI.
- Mniejszy cognitive load.
- Łatwiejsze późniejsze użycie makro w planach dietetycznych.

### Otwarte pytanie
Doprecyzować, czy „3 mniejsze pola” oznaczają dokładnie: **białko / tłuszcz / węglowodany**, czy inny podział pól w formularzu.

### Status
Pomysł zaakceptowany jako uproszczenie modelu i formularza makroskładników.

---

## 5. Jednostki miary — dodać więcej amerykańskich miar

### Problem
Aplikacja powinna lepiej wspierać gotowanie w USA, gdzie przepisy często używają innych jednostek niż europejskie. Sam system gramów i mililitrów nie wystarczy, jeśli użytkownik korzysta z amerykańskich przepisów, produktów i miarek kuchennych.

### Pomysł
Dodać szersze wsparcie dla **amerykańskich jednostek miary** w składnikach, przeliczaniu porcji i importowaniu przepisów.

### Jednostki do obsłużenia

Podstawowe amerykańskie miary objętości:
- teaspoon / tsp,
- tablespoon / tbsp,
- cup,
- fluid ounce / fl oz,
- pint / pt,
- quart / qt,
- gallon / gal.

Miary wagowe:
- ounce / oz,
- pound / lb.

Jednostki praktyczne używane w przepisach:
- stick of butter,
- can,
- package / pkg,
- pinch,
- dash,
- clove,
- slice,
- piece,
- bunch.

### Ważna logika
Aplikacja powinna rozróżniać:
- jednostki wagowe,
- jednostki objętości,
- jednostki sztukowe / opisowe.

Nie wszystkie jednostki da się automatycznie przeliczyć bez informacji o składniku. Przykład: **1 cup flour** i **1 cup sugar** mają inną wagę w gramach.

### Proponowane funkcje
- Możliwość wpisywania składników w amerykańskich jednostkach.
- Możliwość wyboru preferowanego systemu: metric / US / mixed.
- Automatyczne przeliczanie tam, gdzie jest to bezpieczne.
- Ostrzeżenie lub brak automatycznego przeliczenia tam, gdzie potrzebna jest gęstość składnika.
- Mapowanie popularnych konwersji, np. butter sticks, cups flour, cups sugar.

### Wartość dla użytkownika
- Lepsze użycie aplikacji w USA.
- Łatwiejsze przepisywanie/importowanie amerykańskich przepisów.
- Mniej ręcznego przeliczania.
- Większa praktyczność przy gotowaniu z lokalnych produktów i opakowań.

### Status
Pomysł zaakceptowany jako rozszerzenie systemu jednostek i konwersji.
