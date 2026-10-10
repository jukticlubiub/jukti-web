# SEO plan: make juktiverse.com the top result for its own name

Based on Google Search Central's documentation (sources at the end), checked against Google
on 10 Oct 2026.

## Where things stand

| Search | Where www.juktiverse.com shows up |
|---|---|
| **jukti iub** | **#3** (and Events at #6). #1 is IUB's JUKTI club page, #2 the Facebook page |
| **jukti** | **#4**, behind Jukti Lab (juktilab.com), the Facebook page and "Jukti IDE" |
| **juktiverse** | Google replaces it with **"multiverse"**. With that turned off ("Search instead for juktiverse"), the site is #3 (Events) and #7 (home), behind Facebook and Instagram posts |

- **Indexing:** Google has indexed the home page, Team and Events (and folded similar pages together).
- **Out-of-date home page entry:** it's listed under the old address `http://juktiverse.com` with the old description. Google hasn't re-read it since the SEO update.

## Why "juktiverse" turns into "multiverse"

- **Google doesn't know the word yet.** Its spelling system treats "juktiverse" as a typo of a very common word. There's no setting to turn this off.
- **It stops once the word is established.** That happens when pages clearly use it, other sites link to it with that name, and real people search for it and click the site.
- **Today the evidence points to social posts.** Google links "JUKTIverse" mostly to Facebook and Instagram posts. The website uses the word only once: in the hero, and there it joins the word before it in plain text ("Welcome to the**JUKTIverse**").

## The goal, realistically

- **Searches for your name:** "jukti iub", "jukti club", "jukti cse", "juktiverse" should show juktiverse.com first, with sitelinks.
- **Plain "jukti":** it's shared with other companies, so #1 there takes longer and isn't guaranteed.
- **Timing:** Google says changes take "a few hours to several months", and site names "a few days to a few weeks".

## Part 1: On the website (code changes)

1. **Use one consistent name.** Google picks the site name from the home page's WebSite structured data, `og:site_name`, the `<title>` and headings, and says they must match.
   - Today: WebSite name "JUKTI", but `og:site_name` "JUKTI, Club of CSE, IUB".
   - Make `og:site_name` "JUKTI".
   - Add `"JUKTIverse"` and `"juktiverse.com"` (lowercase, as Google recommends) to the WebSite and Organization `alternateName`.
2. **Put JUKTIverse in the home page title and description:**
   - Title, for example: `JUKTI · Club of CSE, IUB | JUKTIverse`
   - Description starting: "JUKTI, the JUKTIverse, is the Club of Computer Science and Engineering at IUB…"
3. **Fix the hero heading text**, so it reads "Welcome to the JUKTIverse" in plain text too (add a space between the two lines).
4. **Use "JUKTIverse" naturally across the site**, not stuffed:
   - the footer line (on every page)
   - the About story
   - the Join and Events intros
5. **Keep the Organization data complete:**
   - logo, `sameAs` (Facebook page, Facebook group, Instagram, LinkedIn), founding date, address (done)
   - add the new alternate names
6. **Breadcrumb structured data** on event, Jukti Logs and helpline pages (optional). It helps Google show "juktiverse.com › Events › …".
7. **Fresh, real content keeps the site ranking** (Google: content "will likely influence your website's presence in search results more than any of the other suggestions"):
   - a Jukti Logs post every month (event recaps, tutorials, results)
   - every event with a real description, cover photo, recap and gallery

## Part 2: Vercel and Search Console (about 15 minutes)

1. **Redirect the old address.** `jukti-web.vercel.app` still shows the whole site (a duplicate). Google says to pick one address and redirect the others.
   - In Vercel: **Settings > Domains**.
   - Set `jukti-web.vercel.app` to **Redirect to** `www.juktiverse.com` (permanent).
2. **Ask Google to re-read the key pages.** In Search Console, use **URL Inspection** on each address below and click **Request indexing**:
   - `https://www.juktiverse.com/`
   - `/team`
   - `/events`
   - `/about`
   - `/join`
3. **Check the sitemap** shows **Success** with about 35 pages (Indexing > Sitemaps).
4. **Track progress weekly.** In **Performance > Search results**, filter queries containing "jukti". Watch the position and clicks for "jukti iub" and "juktiverse".

## Part 3: Outside the website (the biggest lever)

Google finds and trusts sites mainly through links from other sites and through people searching for the name.

1. **IUB's JUKTI club page.** It's #1 for "jukti iub": `iub.ac.bd/campus-life/clubs-at-iub/jukti---the-iub-cse-club`. Ask IUB's web or communications office to add **"Website: www.juktiverse.com"** there. A link from iub.ac.bd is the strongest single link you can get.
2. **Every official profile links to the site:**
   - Facebook page (6.5K followers): About > Website
   - Facebook group: description
   - Instagram: bio
   - LinkedIn page: Website field
   - YouTube, if any
3. **Use the name and the link in posts.** For example: "Explore the JUKTIverse → juktiverse.com". Event announcements should link to the event page on the site (the RSVP lives there anyway).
4. **Ask executives and members** to link "JUKTI – Club of CSE, IUB" to juktiverse.com in their LinkedIn experience entries.
5. **Ask partners and co-hosts** to link to the event page or the site in their posts. Recent ones include Interactive Cares, Creative IT, IEEE SB SEU and the CSE department.
6. **Optional:** a Wikidata entry for JUKTI, with references (IUB page, news) and the official website. It helps Google's Knowledge Graph recognise the organisation.

These steps make real people search for "JUKTIverse" and click the site. That's what teaches Google the word is a name.

## What not to do (Google's spam policies)

- Keyword stuffing (repeating "JUKTI JUKTIverse IUB…"), hidden text, meta keywords (ignored).
- Buying links or link exchanges.
- Asking people to repeatedly search and click to game rankings, or using traffic bots.
- Copying content from other sites, or many near-identical pages.

## Checkpoints

| When | Expect |
|---|---|
| 1 week after Parts 1 and 2 | Home page re-indexed at `https://www.juktiverse.com/` with the new title and description |
| 2–4 weeks | #1 for "jukti iub", "jukti club iub"; sitelinks may start appearing |
| 1–3 months (with Part 3 links) | "juktiverse" stops being replaced by "multiverse"; site #1 for it |

## Sources (Google Search Central)

- SEO Starter Guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Site names: https://developers.google.com/search/docs/appearance/site-names
- Title links: https://developers.google.com/search/docs/appearance/title-link
- Organization structured data: https://developers.google.com/search/docs/appearance/structured-data/organization
- Consolidate duplicate URLs: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Sitelinks: https://developers.google.com/search/docs/appearance/sitelinks
- Crawlable links and anchor text: https://developers.google.com/search/docs/crawling-indexing/links-crawlable
- Helpful, people-first content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
