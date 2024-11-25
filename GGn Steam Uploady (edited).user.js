// ==UserScript==
// @name         GGn Steam Uploady (edited)
// @namespace    https://gazellegames.net/
// @version      17
// @description  Fill upload form with Steam info. Edited from "GGn New Uploady"
// @author       NeutronNoir, ZeDoCaixao, ingts
// @match        https://gazellegames.net/upload.php*
// @match        https://gazellegames.net/torrents.php?action=editgroup*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      store.steampowered.com
// @connect      steamcdn-a.akamaihd.net
// ==/UserScript==

if (typeof GM_getValue('get_languages') === 'undefined')
    GM_setValue('get_languages', true)
if (typeof GM_getValue('format_about') === 'undefined')
    GM_setValue('format_about', true)
if (typeof GM_getValue('get_image_res') === 'undefined')
    GM_setValue('get_image_res', false)


const allowedTags = new Set([
    // "Casual", allowed but too common
    // "Exploration", allowed but too common
    "Action",
    "Adventure",
    "Simulation",
    "Strategy",
    "RPG",
    "Puzzle",
    "Fantasy",
    "Shooter",
    "Platformer",
    "Horror",
    "Visual Novel",
    "Open World",
    "Survival",
    "Sports",
    "Comedy",
    "FPS",
    "Mystery",
    "Sandbox",
    "Fighting",
    "Racing",
    "Shoot 'Em Up",
    "Point & Click",
    "Building",
    "Management",
    "Turn-Based Strategy",
    "Drama",
    "Romance",
    "Interactive Fiction",
    "Hidden Object",
    "Survival Horror",
    "Hack and Slash",
    "Education",
    "Bullet Hell",
    "Dungeon Crawler",
    "Dating Sim",
    "Historical",
    "Walking Simulator",
    "Card Game",
    "Third-Person Shooter",
    "RTS",
    "Life Sim",
    "Clicker",
    "Board Game",
    "Driving",
    "Tower Defense",
    "Time Management",
    "City Builder",
    "Thriller",
    "Wargame",
    "Beat 'em up",
    "Runner",
    "Stealth",
    "Trivia",
    "Typing",
    "Minigames",
    "4X",
    "Cooking",
    "Match 3",
    "Rhythm",
    "Cricket",
    "Rugby",
    "Mahjong",
    "Snowboarding",
    "Hockey",
    "Bowling",
    "Skateboarding",
    "Tennis",
    "Cycling",
    "Wrestling",
    "Basketball",
    "Golf",
    "Chess",
    "Boxing",
    "Gambling",
    "Fishing",
    "Auto Battler",
    "Solitaire",
    "Hunting",
    "Grand Strategy",
    "Space Sim",
])

const tagMap = new Map([
    ["Sci-fi", "science.fiction"],
    ["NSFW", "adult"],
    ["Hentai", "adult"],
    ["Roguelike", "roguelike"],
    ["Roguelite", "roguelike"],
    ["Text-Based", "text.adventure"],
    ["Flight", "flight.simulation"],
    ["Party", "party"],
    ["Party Game", "party"],
    ["Football (American)", "american.football"],
    ["Football (Soccer)", "soccer"],
])


function html2bb(str) {
    if (!str) return ""
    str = str.replace(/< *br *\/*>/g, "\n\n") //*/
    str = str.replace(/< *b *>/g, "[b]")
    str = str.replace(/< *\/ *b *>/g, "[/b]")
    str = str.replace(/< *u *>/g, "[u]")
    str = str.replace(/< *\/ *u *>/g, "[/u]")
    str = str.replace(/< *i *>/g, "[i]")
    str = str.replace(/< *\/ *i *>/g, "[/i]")
    str = str.replace(/<strong><\/strong>/g, " ")
    str = str.replace(/< *strong *>/g, "[b]")
    str = str.replace(/< *\/ *strong *>/g, "[/b]")
    str = str.replace(/< *em *>/g, "[i]")
    str = str.replace(/< *\/ *em *>/g, "[/i]")
    str = str.replace(/< *li *>/g, "[*]")
    str = str.replace(/< *\/ *li *>/g, "")
    str = str.replace(/< *ul *class=\\*"bb_ul\\*" *>/g, "")
    str = str.replace(/< *\/ *ul *>/g, "")
    str = str.replace(/< *h2 *class="bb_tag" *>/g, "\n[align=center][u][b]")
    str = str.replace(/< *h[12] *>/g, "\n[align=center][u][b]")
    str = str.replace(/< *\/ *h[12] *>/g, "[/b][/u][/align]\n")
    str = str.replace(/&quot;/g, "\"")
    str = str.replace(/&amp;/g, "&")
    str = str.replace(/< *a [^>]*>/g, "")
    str = str.replace(/<p class="bb_paragraph"><\/p>/g, '\n\n')
    str = str.replace(/<p class="bb_paragraph">/g, '')
    str = str.replace(/< *\/ *a *>/g, "")
    str = str.replace(/< *p *>/g, "\n\n")
    str = str.replace(/<\/p>/g, "")
    str = str.replace(//g, "\"")
    str = str.replace(//g, "\"")
    str = str.replace(/  +/g, " ")
    str = str.replace(/\n +/g, "\n")
    str = str.replace(/\n\n\n+/gm, "\n\n")
    str = str.replace(/\n\n\n+/gm, "\n\n")
    str = str.replace(/\[\/b]\[\/u]\[\/align]\n\n/g, "[/b][/u][/align]\n")
    str = str.replace(/\n\n\[\*]/g, "\n[*]")
    str = str.replace(/< *img.*?>/g, "\n")
    return str
}

function fix_emptylines(str) {
    const lst = str.split("\n")
    let result = ""
    let empty = 1
    lst.forEach(function (s) {
        if (s) {
            empty = 0
            result = result + s + "\n"
        } else if (empty < 1) {
            empty = empty + 1
            result = result + "\n"
        }
    })
    return result
}

function pretty_sr(str) {
    if (!str) return ""
    str = str.replace(/™/g, "")
    str = str.replace(/®/g, "")
    str = str.replace(/:\[\/b] /g, "[/b]: ")
    str = str.replace(/:\n/g, "\n")
    str = str.replace(/:\[\/b]\n/g, "[/b]\n")
    str = str.replace(/\n\n\[b]/g, "\n[b]")
    return str
}

function formatAbout(about) {
    if (!GM_getValue('format_about')) return about
    const toTitleCase = unsafeWindow?.TitleAndScreenshotsFormatter?.toTitleCase ?? function (str) {
        return str
    }

    function fixSplitLinesInListItems(input) {
        let lines = input.split('\n')
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith("[*]")) {
                while (i + 1 < lines.length && !lines[i].match(/[.?!。？！]$/)) {
                    if (lines[i + 1].startsWith("[*]")) {
                        lines[i] += '.'
                        break
                    } else if (lines[i + 1].trim() !== '') {
                        lines[i] += ' ' + lines.splice(i + 1, 1)[0]
                    } else {
                        lines.splice(i + 1, 1)
                    }
                }
            }
        }
        return lines.join('\n')
    }

    // If a line starts with [u], [i], or [b], there is no other text on that line, and it contains 'features', replace tags with [align=center][b][u]
    about = about.replace(/^(\[b]|\[u]|\[i])*(.*?)(\[\/b]|\[\/u]|\[\/i])*$/gm, (match, p1, p2, p3) => {
        return (p1 && p3 && /features/i.test(p2)) ? `[align=center][b][u]${p2}[/u][/b][/align]` : match
    })

    // Title case text inside [align=center][b][u]
    about = about.replace(/\[align=center]\[([bu])]\[([bu])]([\s\S]*?)\[\/\2]\[\/\1]\[\/align]/g, (match, p1, p2, p3) => {
        return `[align=center][b][u]${toTitleCase(p3)}[/u][/b][/align]`
    })

    // Add a newline before lines with [align=center] if there isn't already a double newline before it
    about = about.replace(/(?<!\n\n)(\[align=center])/g, '\n\$1')

    // Remove colons in text inside [align=center][b][u]
    about = about.replace(/\[align=center]\[b]\[u](.*?)\[\/u]\[\/b]\[\/align]/g, (match, p1) => {
        return match.replace(/:/g, '')
    })

    // Replace different list symbols at the start with [*]
    about = about.replace(/^[-•◦]\s*/gm, '[*]')

    // If a line starts with [u], [i], or [b] and it is not the only text on that line, add [*] at the start and replace tags with [b]
    about = about.replace(/^(\[b]|\[u]|\[i])*(.*?)(\[\/b]|\[\/u]|\[\/i])+(.*$)/gm, (match, p1, p2, p3, p4) => {
        if (p4.trim() === '') {
            return match
        }
        return p1 && p3 ? `[*][b]${p2}[/b]${p4}` : match
    })

    // If a line starts with [*] followed by a [u] or [i], replace them with [b]
    about = about.replace(/^\[\*]\[[ui]](.*?)\[\/[ui]]/gm, '[b]$1[/b]')

    // Title case text inside tags for lines starting with [u], [i], or [b] and has nothing else after the closing tag
    about = about.replace(/(^|\n)(\[([uib])](.*?)\[\/([uib])]\s*$)/gm, (match, p1, p2, p3, p4) => `${p1}[${p3}]${toTitleCase(p4)}[/${p3}]`)

    // For lines that start with [*], replace newlines with spaces  until that line ends with ., ?, or !
    // and add a full stop if there is no punctuation before another [*]
    about = fixSplitLinesInListItems(about)

    // Remove double newlines between [*] lines
    about = about.replace(/(\[\*][^\n]*)(\n{2,})(?=\[\*])/g, '$1\n')

    // Add a newline when next line doesn't start with [*]
    about = about.replace(/(\[\*][^\n]*\n)([^\[*\]\n])/g, '$1\n$2')

    // Move : and . outside of closing tags
    about = about.replace(/(\[([bui])])(.*?)([:.])\[\/([bui])]/g, '$1\$3[/b]\$4')

    // Remove [u], [i], or [b] if the line starts with [*] followed by a [u], [i], or [b], and ends with a punctuation after the closing tag
    about = about.replace(/^\[\*]\[([bui])](.*?)\[\/([bui])]([.?!。？！])$/gm, "[*]$2$4")

    // If a line ends with [/align] replace double newlines with one newline
    about = about.replace(/(\[\/align])\n\n/g, '$1\n')

    return about
}

function fill_form(response) {
    const gameInfo = response.response[steamIdInput.value].data
    let about = gameInfo.about_the_game
    if (about === '') {
        about = gameInfo.detailed_description
    }
    about = "[align=center][b][u]About the game[/u][/b][/align]\n" + formatAbout(html2bb(about)).trim()
    const year = gameInfo.release_date.date.split(", ").pop()
    const screens = document.getElementsByName("screens[]")
    const add_screen = $("#image_block a[href='#']").first()

    for (let i = 0; i < gameInfo.screenshots.length; i++) {
        if (i === 20) break
        if (i >= 4) add_screen.click()
        screens[i].value = gameInfo.screenshots[i].path_full.split("?")[0]
        if (GM_getValue('get_image_res')) {
            new Promise((resolve, reject) => {
                let img = new Image()
                img.src = gameInfo.screenshots[i].path_full.split("?")[0]
                img.onload = () => resolve(img)
                img.onerror = () => reject()
            }).then(img => {
                screens[i].parentElement.style.position = 'relative'
                screens[i].insertAdjacentHTML('afterend',
                    `<span style="position:absolute;top: -115%;right: 9.5%;">${img.naturalWidth}x${img.naturalHeight}</span>`)
            })
        }
    }

    const ratings = gameInfo.ratings
    const ratingInput = document.getElementById('Rating')

    const ratingMap = new Map([ // dejus and steam_germany can be self rated
        ['pegi', new Map([
            ['3', 1],
            ['7', 3],
            ['12', 5],
            ['16', 7],
            ['18', 9],
        ])],
        ['esrb', new Map([
            ['e', 1],
            ['e10', 3],
            ['t', 5],
            ['m', 7],
            ['ao', 9],
        ])],
        ['nzoflc', new Map([
            ['g', 1],
            ['r13', 7],
            ['r16', 7],
            ['r18', 9],
        ])],
        ['cero', new Map([
            ['a', 1],
            ['b', 3],
            ['c', 5],
            ['d', 7],
            ['z', 9],
        ])],
        ['csrr', new Map([ // gsrr?
            ['g', 1],
            ['p', 3],
            ['pg12', 5],
            ['pg15', 7],
            ['r', 9],
        ])],
        ['usk', new Map([
            ['0', 1],
            ['6', 3],
            ['12', 5],
            ['16', 7],
            ['18', 9],
        ])]
    ])

    for (const [k, v] of ratingMap) {
        if (Object.hasOwn(ratings, k)) {
            ratingInput.value = v.get(ratings[k].rating)
            ratingInput.closest('tr').firstElementChild
                .insertAdjacentHTML('beforeend', `<span style="color: #d6c9b6;display: block;">Source: ${k}</span>`)
            break
        }
    }

    if (!ratingInput.value)
        ratingInput.value = 13

    let platform = "Windows"
    let cover_field = "input[name='image']"
    let desc_field = "textarea[name='body']"

    if (window.location.href.includes("action=editgroup")) {
        $("input[name='year']").val(year)
        $("input[name='name']").val(gameInfo.name)
        if ($("#trailer~a").attr("href").includes("Linux")) {
            platform = "Linux"
        } else if ($("#trailer~a").attr("href").includes("Mac")) {
            platform = "Mac"
        }
    } else {
        const parseSteamLanguage = unsafeWindow?.GetLanguagesFromSteam?.parseSteamLanguage // from Get Languages From Steam script
        if (parseSteamLanguage && GM_getValue('get_languages') && !document.getElementById('empty_group').checked) {
            parseSteamLanguage(gameInfo.supported_languages)
        }

        $("#title").val(gameInfo.name)
        $("#gameswebsiteuri").val(gameInfo.website)
        $("#year").val(year)
        cover_field = "#image"
        desc_field = "#album_desc"
        platform = $("#platform").val()
    }

    let recfield = gameInfo.pc_requirements
    switch (platform) {
        case "Windows":
            recfield = gameInfo.pc_requirements
            break
        case "Linux":
            recfield = gameInfo.linux_requirements
            break
        case "Mac":
            recfield = gameInfo.mac_requirements
            break
    }
    let sr = ''
    if (typeof (recfield.minimum) !== "undefined") {
        sr += html2bb(recfield.minimum)
    }
    if (typeof (recfield.recommended) !== "undefined") {
        sr += "\n" + html2bb(recfield.recommended)
    }
    sr = "\n\n[quote][align=center][b][u]System Requirements[/u][/b][/align]\n\n" +
        pretty_sr(sr) +
        "[/quote]"
    $(desc_field).val(about)
    $(desc_field).val($(desc_field).val() + sr)
    $(cover_field).val(gameInfo.header_image.split("?")[0])
    const big_cover = "https://steamcdn-a.akamaihd.net/steam/apps/" + steamIdInput.value + "/library_600x900_2x.jpg"
    GM_xmlhttpRequest({
        method: "GET",
        url: big_cover,
        responseType: "json",
        onload: function (response) {
            if (response.status === 200) {
                $(cover_field).val(big_cover)
            }
        }
    })
    $(desc_field).val(fix_emptylines($(desc_field).val()))
    if (gameInfo.metacritic) {
        $("#meta").val(gameInfo.metacritic.score)
        $("#metauri").val(gameInfo.metacritic.url.split("?")[0] + "/critic-reviews")
    }
    if (gameInfo.hasOwnProperty('movies')) {
        $("#trailer").val(gameInfo.movies[0].webm.max.split("?")[0])
    }
}

let steamIdInput

if (window.location.href.includes("action=editgroup")) {
    $("td.center").parent().after("<tr><td class='label'>Steam ID</td><td><input id='steamid' /></td></tr>")
    steamIdInput = document.getElementById('steamid')
} else {
    steamIdInput = document.getElementById('steamid')
    steamIdInput.type = 'text'
    steamIdInput.size = 20
    steamIdInput.removeAttribute('min')
    steamIdInput.insertAdjacentHTML('afterend',
        '<a href="javascript:;" id="fill_win">Win</a> <a href="javascript:;" id="fill_lin">Lin</a> <a href="javascript:;" id="fill_mac">Mac</a>')
    $('#fill_win').click(function () {
        $("#platform").val("Windows")
    })
    $('#fill_lin').click(function () {
        $("#platform").val("Linux")
    })
    $('#fill_mac').click(function () {
        $("#platform").val("Mac")
    })
}

steamIdInput.onblur = () => {
    if (steamIdInput.value.includes('store.steampowered')) {
        steamIdInput.value = /\d+/.exec(steamIdInput.value)[0]
    }
    GM_xmlhttpRequest({
        method: "GET",
        url: "https://store.steampowered.com/api/appdetails?l=en&appids=" + steamIdInput.value,
        responseType: "json",
        onload: fill_form
    })
    if (location.href.includes('upload.php')) {
        GM_xmlhttpRequest({
            url: `https://store.steampowered.com/app/${steamIdInput.value}`,
            onload: function (res) {
                const page = new DOMParser().parseFromString(res.responseText, "text/html")
                let uploadTags = new Set()

                for (const steamTag of page.querySelectorAll('.glance_tags a')) {
                    const text = steamTag.textContent.trim()
                    if (allowedTags.has(text)) {
                        uploadTags.add(text.toLowerCase()
                            .replace(/sim(?!\w)/, "simulation")
                            .replace(/'/g, '').replace(/&/g, 'and').replace(/-/g, ' ').replace(/ /g, '.'))
                        continue
                    }
                    const t = tagMap.get(text)
                    if (t) {
                        uploadTags.add(t)
                    }
                }
                document.getElementById('tags').value = Array.from(uploadTags).join(', ')
                if (uploadTags.has('adult'))
                    document.getElementById('Rating').value = 9
            }
        })
    }
}
