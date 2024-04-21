// ==UserScript==
// @name         GGn vndb uploady new
// @namespace    none
// @version      4
// @description  input game title or vndb id (anything with v(digits)) and click vndb to fill
// @author       ingts
// @match        https://gazellegames.net/upload.php*
// @connect      api.vndb.org
// @icon         none
// @grant        GM_xmlhttpRequest
// ==/UserScript==

const autoSearchTrailer = false
const autoPTPimg = false

const tagsDictionary = {
    'romance': ["Love", "Polyamory", "Polygamy", "Swinging", "Romance"],
    'horror': ["Horror", "Graphic Violence"],
    'science.fiction': ["Science Fiction", "AI"],
    'drama': ["Drama", "Suicide", "Suicidal", "Desperation"],
    'crime': ["Crime", "Slave"],
    'mystery': ["Mystery", "Amnesia", "Disappearance", "Secret Identity"],
    'comedy': ["Comedy", "Slapstick", "Comedic"],
    'fantasy': ["Fantasy", "Magic", "Mahou", "Superpowers"]
}

function removeLastBracket(str) {
    if (!str) return ''
    if (!str.endsWith(']')) return str

    let i = str.length - 1
    let bracketCounter = 0
    for (; i >= 0; i--) {
        if (str[i] === ']') {
            bracketCounter++
        } else if (str[i] === '[') {
            bracketCounter--
            if (bracketCounter === 0) {
                break
            }
        }
    }
    return str.substring(0, i).trim()
}

const gameTitleInput = document.getElementById('title')
gameTitleInput.insertAdjacentHTML("afterend", '<a href="javascript:" id="fill_vndb">vndb</a>')
const fill_vndb = document.getElementById('fill_vndb')

function fill(results) {
    const pcPlatforms = ['win', 'lin', 'mac']
    const consoleOnly = results.platforms.every(platform => !pcPlatforms.includes(platform))

    if (!consoleOnly) {
        document.getElementById('platform').value = 'Windows'
    }
    const englishTitle = results.titles.find(a => a.lang === 'en')
    gameTitleInput.value = englishTitle ? englishTitle.title : results.title

    if (autoSearchTrailer) window.open(`https://www.youtube.com/results?search_query=${gameTitleInput.value} trailer`, '_blank').focus()

    document.getElementById('aliases').value = [results.alttitle, results.aliases.join(", "), englishTitle ? results.title : null].filter(Boolean).join(', ')


    const tagsInput = document.getElementById('tags')
    let foundTags = new Set()

    const noRomance = results.tags.some(tag => tag.name === "No Romance Plot")

    for (const ggnTag of Object.keys(tagsDictionary)) {
        if (ggnTag === 'romance' && noRomance) {
            continue
        }
        for (const vndbTag of results.tags) {
            if (tagsDictionary[ggnTag].some(word => vndbTag.name.includes(word))) {
                foundTags.add(ggnTag)
            }
        }
    }

    tagsInput.value = foundTags.size === 0 ? 'visual.novel' : `visual.novel, ${Array.from(foundTags).join(', ')}`

    document.getElementById('year').value = results.released === 'TBA' ? new Date().getFullYear() : results.released.split('-')[0]

    GM_xmlhttpRequest({
        method: 'POST',
        url: 'https://api.vndb.org/kana/release',
        headers: {'Content-Type': 'application/json'},
        data: JSON.stringify({
            "filters": ["vn", "=", ["id", "=", results.id]],
            "fields": "minage, has_ero",
            "results": 100
        }),
        responseType: "json",
        onload: function (response) {
            let ratingSelectValue
            const highestMinAge = Math.max(...response.response.results.map(result => result.minage))
            if (highestMinAge === 12 || highestMinAge === 13) ratingSelectValue = 5
            else if (highestMinAge === 16 || highestMinAge === 17) ratingSelectValue = 7
            else if (highestMinAge >= 18) ratingSelectValue = 9
            else ratingSelectValue = 13
            document.getElementById('Rating').value = ratingSelectValue
            if (response.response.results.some(r => r.has_ero))
                tagsInput.value += ', adult'
        }
    })

    document.getElementById('image').value = results.image.url
    if (autoPTPimg) document.getElementById('image').nextElementSibling.click()

    const systemRequirements = `
[quote][align=center][b][u]System Requirements[/u][/b][/align]
[*][b]OS[/b]: 
[*][b]Processor[/b]: 
[*][b]Memory[/b]: 
[*][b]Graphics[/b]: 
[*][b]DirectX[/b]: 
[*][b]Storage[/b]: [/quote]`
    const descInput = document.getElementById('album_desc')
    descInput.value =
        `[align=center][b][u]About the game[/u][/b][/align]
${removeLastBracket(results.description)}
${consoleOnly ? '' : systemRequirements}
`
    // if its on pc and console
    if (!consoleOnly && results.platforms.some(platform => !pcPlatforms.includes(platform))) {
        fill_vndb.removeEventListener('click', start)
        fill_vndb.textContent = 'console version found. click to remove system requirements'
        fill_vndb.addEventListener('click', () => {
            descInput.value = descInput.value.replace(systemRequirements, '')
            fill_vndb.outerHTML = '<span>removed</span>'
        })
    }

    const screens = document.getElementsByName("screens[]")
    const add_screen = document.querySelector("#image_block a[href='#']")
    results.screenshots.forEach((screen, index) => {
        if (index >= 20) return
        if (index >= 4) add_screen.click()
        screens[index].value = screen.url
        if (autoPTPimg) screens[index].nextElementSibling.click()
    })
}

function start() {
    if (!gameTitleInput.value) {
        return
    }
    const linkmatch = gameTitleInput.value.match(/v(\d+)/)
    GM_xmlhttpRequest({
        method: 'POST',
        url: 'https://api.vndb.org/kana/vn',
        headers: {'Content-Type': 'application/json'},
        data: JSON.stringify({
            "filters": linkmatch ? ["id", "=", `${linkmatch[1]}`] : ["search", "=", `${gameTitleInput.value}`],
            "fields": "alttitle, titles.title, title, aliases, description, image.url, screenshots.url, released, titles.lang, tags.name, platforms",
            "results": 1
        }),
        responseType: "json",
        onload: function (response) {
            fill(response.response.results[0])
        }
    })
}

fill_vndb.addEventListener('click', start)