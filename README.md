# Mökki – perheen yhteinen mökkikirja

Pelkkä HTML/JS-sovellus, joka tallentaa tiedot Firebase-projektiin **Jannenranta**. Toimii puhelimessa asennettavana sovelluksena (PWA) ja myös ilman verkkoyhteyttä.

## Kirjautuminen (sama malli kuin veikkaussovelluksessa)
1. Laite kirjautuu **kerran** yhteisellä tunnuksella `terokulju95@gmail.com` (sovellus kysyy vain salasanan).
2. Jokainen valitsee oman nimensä ja syöttää oman **4-numeroisen PIN-koodin**.
3. Tero (👑) asettaa PIN-koodit kohdassa **Lisää → Käyttäjät ja PIN-koodit**. Siellä voi myös lisätä, nimetä ja poistaa käyttäjiä.

Käyttäjät: Tero (pääkäyttäjä), Timo, Tiina, Tepa, Äiti, Iskä.

## Ulkoasu (vain pääkäyttäjä)
**Lisää → Ulkoasu** näkyy vain pääkäyttäjälle. Siellä voi muokata:
- **Värit** – valmiit teemat (Metsä, Järvi, Sauna, Graniitti, Kanerva) tai jokainen väri erikseen, erikseen vaalealle ja tummalle tilalle. Väritilan voi pakottaa aina vaaleaksi tai tummaksi. Sovellus varoittaa, jos teksti on huonosti luettavissa.
- **Muodot** – korttien, painikkeiden ja kenttien pyöristys, reunaviivat, varjot ja väljyys.
- **Teksti** – tekstin koko, fontit, otsikoiden paksuus ja koko.
- **Tekstisisältö** – sovelluksen nimi, tervehdys, tiedote kaikille etusivulle ja alavalikon nimet.
- **Etusivu** – muokataan suoraan etusivulla (✎ Muokkaa etusivua): korttien järjestys, koko (iso / pieni / puolikas), otsikot, tervehdys ja tiedote.
- **Alavalikko** – mitkä osiot (enintään 5) näkyvät alavalikossa ja millä nimellä. Loput löytyvät Lisää-valikosta.
- **Ominaisuudet** – tehtävien määräajat, laskujen eräpäivät ja toistuvat laskut. Oletuksena pois päältä.

Muutokset näkyvät ensin vain pääkäyttäjälle esikatseluna. **Tallenna kaikille** päivittää ne kaikkien laitteisiin heti.

## Käyttöönotto

### 1. Firebase (projekti Jannenranta)
1. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable → Save**.
2. **Authentication → Users → Add user**: sähköposti `terokulju95@gmail.com` ja yhteinen salasana, jonka kerrot perheelle.
3. Kopioi samalta sivulta käyttäjän **User UID** talteen.
4. **Build → Firestore Database → Create database** → sijainti `europe-north1 (Finland)` → *production mode*.
5. **Firestore → Rules**: liitä `firestore.rules`-tiedoston sisältö, vaihda `LIITÄ_OMA_UID_TÄHÄN` kohdan 3 UID:ksi ja paina **Publish**.
6. **Project settings (ratas) → General → Your apps → `</>`** → rekisteröi web-sovellus (ei Hostingia) → kopioi `firebaseConfig`-arvot tiedostoon `firebase-config.js` `LIITÄ_TÄHÄN`-kohtiin.

Sähköposti, käyttäjät ja pääkäyttäjä on jo valmiina `firebase-config.js`-tiedostossa.

### 2. GitHub Pages
1. Uusi repo, esim. `mokki` (repon nimessä kannattaa välttää ö-kirjainta; sovelluksen nimi on silti Mökki).
2. **Add file → Upload files** → vedä kaikki tiedostot ja `icons`-kansio repon juureen → **Commit changes**.
3. **Settings → Pages → Deploy from a branch → `main` / `(root)` → Save**.
4. Osoite: `https://käyttäjänimi.github.io/mokki/`

### 3. Ensimmäinen käynnistys
1. Avaa osoite, syötä yhteinen salasana.
2. Valitse **Tero** ja syötä mikä tahansa 4 numeroa (ensimmäisellä kerralla Terolla ei ole vielä PIN-koodia).
3. Aseta itsellesi ja muille PIN-koodit: **Lisää → Käyttäjät ja PIN-koodit**.

### Asennus puhelimeen
- **iPhone:** Safari → Jaa → *Lisää Koti-valikkoon*
- **Android:** Chrome → ⋮ → *Asenna sovellus*

## Päivittäminen
Kun muutat tiedostoja, kasvata `sw.js`-tiedoston alussa olevaa versiota (esim. `mokki-v4` → `mokki-v5`).

## Tietorakenne (Firestore)
`app/users` käyttäjät ja PIN-koodit · `app/theme` ulkoasu · `info/main` perustiedot · `places` · `contacts` · `logs` nuohous/puut/huollot · `todos` · `checkItems` · `seasonRuns` · `inventory` · `shopping` · `payments` · `repairs` · `bookings` · `photos`
