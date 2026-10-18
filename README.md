# Reiseregning 2026 - Statens Satser (React + TypeScript)

En moderne, produksjonsklar webapplikasjon i React og TypeScript for utfylling, beregning, godkjenning og eksport av reiseregninger basert på Statens satser for 2026.

## Funksjoner

- **Statens satser 2026**:
  - Kjøregodtgjørelse: 5,30 kr/km (+ 1,00 kr/km passasjertillegg) og bompenger
  - Døgn- og dagsats diett med automatisk timesberegning (>6t og >12t)
  - Valg mellom Statens satser og Trekkfrie satser
  - Overnattingstyper: Ingen, Hotell, Kokemuligheter, Uten kokemuligheter
  - Måltidstrekk: Frokost (20%), Lunsj (30%), Middag (50%)
- **Utlegg og kvitteringer**:
  - Ubegrenset antall utleggsrader med dato, beskrivelse, beløp og bilagsindikator
  - Bildeopplasting av kvitteringer med forhåndsvisning og automatisk vedlegg i PDF
- **Digital signatur**:
  - Tegn med finger/mus på interaktivt lerret eller last opp signaturbilde
- **Eksport og forhåndsvisning**:
  - A4-tilpasset forhåndsvisning og PDF-utskrift (`window.print`)
  - Semikolon-separert CSV-eksport formatert for norske regnskapssystemer (Excel/UTF-8 BOM)
- **Konto og Bedriftsportal (Admin & Ansatt)**:
  - Bruk som privatperson eller som ansatt i bedrift
  - Opprett firma med unik 6-sifret invitasjonskode eller bli med med kode
  - Ansattvisning: Statusoppfølging (Utkast, Innsendt, Godkjent, Utbetalt, Avvist, Kansellert), trekke tilbake innsendt reiseregning, redigere avviste/kansellerte reiser
  - Leder-/Adminvisning: Nøkkeltall, oversikt over ansatte, godkjenning, avvisning med begrunnelse, utbetalingsmarkering og angre-funksjon
- **Resilient datalagring**:
  - Støtter skybasert Supabase-synkronisering med sømløs offline- og lokal fallback.

## Teknologistakk

- **Rammeverk**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Ikoner**: Lucide React
- **Autentisering & Database**: Supabase & LocalStorage resilient fallback
