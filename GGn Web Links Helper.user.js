// ==UserScript==
// @name         GGn Web Links Helper
// @namespace    none
 // @version     1.5.4
// @description  Adds buttons that enables editing web links from the group page and to auto search for links
// @author       ingts
// @match        https://gazellegames.net/torrents.php?id=*
// @match        https://gazellegames.net/torrents.php?action=editgroup&groupid=*
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @connect      *
// ==/UserScript==

if (typeof GM_getValue('corner_button') === 'undefined')
    GM_setValue('corner_button', true)
if (typeof GM_getValue('columns') === 'undefined')
    GM_setValue('columns', 3)
if (typeof GM_getValue('max_results') === 'undefined')
    GM_setValue('max_results', 2)
if (typeof GM_getValue('auto_search') === 'undefined')
    GM_setValue('auto_search', true)
if (typeof GM_getValue('auto_search_reviews') === 'undefined')
    GM_setValue('auto_search_reviews', true)
if (typeof GM_getValue('check_first_word') === 'undefined')
    GM_setValue('check_first_word', true)
if (typeof GM_getValue('refresh_after_submit') === 'undefined')
    GM_setValue('refresh_after_submit', false)
if (typeof GM_getValue('default_unchecked') === 'undefined')
    GM_setValue('default_unchecked', false)


let auto_search = GM_getValue('auto_search')
/** @type number */
const max_results = GM_getValue('max_results')
const isEditPage = location.href.includes('editgroup')
const default_unchecked = GM_getValue('default_unchecked')

// review site arrays: name, search url, score input id, score input max, step, urlinputid, input pattern (unofficial)
const reviewSites = [
    ["Metascore", "https://www.metacritic.com/search/NAME?category=13&page=1", "meta", "100", "1", "metauri", '.*metacritic.com\/game\/.*\/critic-reviews\/.*'],
    ["IGN", "https://www.google.com/search?q=site:ign.com/articles+NAME%20review", "ignscore", "10", "0.1", "ignuri", '.*ign.com\/articles/\.*'],
    ["GameSpot", "https://www.gamespot.com/search/?i=reviews&q=NAME", "gamespotscore", "10", "0.1", "gamespotscoreuri", '.*gamespot.com\/reviews\/.*'],
]

// site arrays: name, search url, input id, input pattern
const commonSites = [
    ['Games Website', 'https://www.google.com/search?q=NAME%20official%20website', 'gameswebsiteuri', '.*'],
    ['Wikipedia', 'https://www.google.com/search?q=NAME site:wikipedia.org', 'wikipediauri', '^(https?:\/\/|)[a-z][a-z]\.wikipedia\.org\/wiki\/.*?$'],
    ['Amazon', 'https://www.google.com/search?q=site:amazon.*%20NAME', 'amazonuri', '^(https?:\/\/|)(www.|)amazon\.(..|...|.....)\/.*?$'],
]

const commonGameSites = [
    ['Giantbomb', 'https://www.giantbomb.com/search/?i=game&q=NAME', 'giantbomburi', '^(https?:\/\/|)(www.|)giantbomb\.com\/.*?$'],
    ['HowLongToBeat', 'https://howlongtobeat.com/?q=NAME', 'howlongtobeaturi', '^https:\/\/howlongtobeat\.com\/game\/[0-9]*?$'],
]

const consoleAndPcSites = [
    ['VNDB', 'https://vndb.org/v/all?sq=NAME', 'vndburi', '^(https?:\/\/|)(www.|)vndb.org\/v[0-9]*?$'],
    ['GameFAQs', 'https://gamefaqs.gamespot.com/search?game=NAME', 'gamefaqsuri', '^(https?:\/\/|)(www.|)gamefaqs\.(gamespot.|)com\/.*?$'],
    ['Moby Games', 'https://www.mobygames.com/search/?q=NAME&type=game', 'mobygamesuri', '^(https?:\/\/|)(www.|)mobygames\.com\/(game|browse\/games)\/.*?$'],
]

const commonPcSites = [
    ['Steam', 'https://store.steampowered.com/search/?term=NAME&amp;category1=998&amp;ndl=1', 'steamuri', '^(https?:\/\/|)store\.steampowered\.com\/(app|sub)\/.*?$'],
    ['GOG', 'https://www.gog.com/games?query=NAME', 'goguri', '^(https?:\/\/|)(www.|)gog\.com\/(en\/)?game\/.*?$'],
    ['Humble Bundle', 'https://www.humblebundle.com/store/search?search=NAME', 'humbleuri', '.*humblebundle.com\/store\/.*'],
    ['PCGamingWiki', 'https://pcgamingwiki.com/w/index.php?search=NAME&fulltext=1', 'pcwikiuri', '^(https?:\/\/|)(www.|)pcgamingwiki\.com\/wiki\/.*?$'],
]

const windowsAndMacSites = [
    ['Epic Games', 'https://www.epicgames.com/store/en-US/browse?q=NAME&sortBy=relevancy&category=Game',
        'epicgamesuri', '^(https?:\/\/|)(www.|store.|)epicgames\.com\/(store\/|)en-US\/(p|product)\/[a-z0-9\-]+(\/home)?$'],
]

const windowsSites = [
    ['Nexus Mods', 'https://www.nexusmods.com/search/?gsearch=NAME&gsearchtype=games&tab=games', 'nexusmodsuri', '^(http(s)?:\/\/|)(www.|)nexusmods\.com\/.*?$'],
]

const macAndiOSSites = [
    ['iTunes Store', 'https://www.google.com/search?q=site:apps.apple.com/*/NAME', 'itunesuri', '^(https?:\/\/|)(itunes|music|apps)\.apple\.com\/.*?$']
]

const androidSites = [
    ['Google Play', 'https://play.google.com/store/search?q=NAME&c=apps', 'googleplayuri', '^(https?:\/\/|)play\.google\.com\/store\/apps\/.*?$']
]

const pcAndPPrpgSites = [
    ['Itch.io', 'https://itch.io/search?q=NAME', 'itchuri', '^(https?:\/\/|).*?\.itch\.io\/.*?$'],
]

const playstation4Sites = [
    ['PSN', 'https://www.playstation.com/en-us/search/?q=NAME&category=games', 'psnuri', '^(https?:\/\/|)(www.|)(jp.|)(store.|)playstation\.com\/.*(games|title|[a-z][a-z]-[a-z][a-z]\/product)\/.*?$'],
]

const switchSites = [
    ['Nintendo', 'https://www.nintendo.co.uk/Search/Search-299117.html?q=NAME', 'nintendouri', '^(https?:\/\/|)(www.|ec.|store-jp.)nintendo\.(com|co\.uk|co\.jp)\/.*[a-zA-Z0-9-]+(\.html)?\/?$'],
]

const PPrpgSites = [
    ['RPGGeek', 'https://rpggeek.com/geeksearch.php?action=search&objecttype=rpg&q=NAME', 'rpggeekuri', '^(https?:\/\/|)(www.|)rpggeek\.com\/rpg[A-Za-z]*?\/.*?$'],
    ['RPG.net', 'https://index.rpg.net/display-search.phtml?key=title&value=NAME', 'rpgneturi', '^(https?:\/\/|)index\.rpg\.net\/display-entry\.phtml\?mainid\=[0-9]*?$'],
    ['DriveThruRPG', 'https://drivethrurpg.com/browse.php?keywords=NAME', 'drivethrurpguri', '^(https?:\/\/|)(www.|)drivethrurpg\.com\/product\/[0-9]*?\/.*?$'],
]

const boardGameSites = [
    ['BoardGameGeek', 'https://boardgamegeek.com/geeksearch.php?action=search&objecttype=boardgame&q=NAME', 'boardgamegeekuri', '^(https?:\/\/|)(www.|)boardgamegeek\.com\/boardgame\/.*?$'],
]

const ostSites = [
    ['VGMdb', 'https://vgmdb.net/search?q=NAME', 'vgmdburi', ''],
    ['Discogs', 'https://www.discogs.com/search/?type=release&q=NAME', 'discogsuri', ''],
    ['Bandcamp', 'https://bandcamp.com/search?q=NAME&item_type=a', 'bandcampuri', ''],
    ['MusicBrainz', 'https://musicbrainz.org/search?type=release&method=indexed&query=NAME', 'musicbrainzuri', ''],
    ['iTunes', 'https://www.google.com/search?q=site:music.apple.com/*/album/NAME', 'itunesuri', ''],
]

const ebookSites = [
    ['Google Play Books', 'https://play.google.com/store/search?c=books&q=NAME', 'googleplaybooksuri', ''],
    ['Goodreads', 'https://www.goodreads.com/search?utf8=%E2%9C%93&query=NAME', 'goodreadsuri', ''],
]

GM_addStyle( // language=css
    `
        #wlhelper-search-all { /* for edit page */
            display: block;
            margin: 15px auto;
        }
    `)
let groupname = '', encodedGroupname = '', groupnameFirstWord = '', platform = '', isAdult = false

if (isEditPage) {
    platform = GM_getValue('platform')
    isAdult = GM_getValue('isAdult')
    GM_deleteValue('platform')
    GM_deleteValue('isAdult')
    groupname = document.querySelector('h2 a').textContent
    setAlternateNames(groupname)

    let reviewsTable
    if (platform) {
        reviewsTable = document.getElementById('reviews_table').firstElementChild
        reviewsTable.style.display = 'flex'
        reviewsTable.style.flexDirection = 'column'
        reviewsTable.insertAdjacentHTML('afterbegin', `
    <button type="button" id="wlhelper-search-all">Search All</button>`)
    } else {
        document.querySelector('input[name=year]').insertAdjacentHTML('afterend', `
    <button type="button" id="wlhelper-search-all">Search All</button>`)
    }

    const links = document.getElementById('weblinks_edit').firstElementChild
    const form = links.closest('form')

    for (const tr of links.children) {
        const secondTd = tr.children[1]
        secondTd.style.display = 'flex'
        secondTd.style.flexDirection = 'column'
        secondTd.querySelector('br').remove()
    }

    function changeHrefs(siteArray) {
        siteArray.forEach(([, url, id]) => {
            const input = document.getElementById(id)
            if (input)
                input.closest('tr').querySelector('a').href = url.replace('NAME', encodedGroupname)
        })
    }

    changeHrefs(reviewSites)
    changeHrefs(commonSites)
    changeHrefs(commonGameSites)
    changeHrefs(consoleAndPcSites)
    changeHrefs(commonPcSites)
    changeHrefs(windowsAndMacSites)

    addSearchAllButtonHandler(form, reviewsTable)

    addCheckboxesInputHandler(form)
    addSubmitHandler(form)

} else {
    const groupDetails = document.getElementById('content')
    if (groupDetails && !document.querySelector("#group_nofo_bigdiv > div.head").textContent.includes("Application")) {
        platform = document.getElementById('groupplatform')?.textContent
        isAdult = !!document.querySelector("#tagslist a[href*='adult']")
        GM_setValue('platform', platform ?? undefined)
        GM_setValue('isAdult', isAdult)

        GM_registerMenuCommand('Run', () => {
            runGroup()
        })
        if (auto_search) {
            GM_registerMenuCommand('Run (without auto search)', () => {
                auto_search = false
                runGroup()
            })
        }

        if (GM_getValue('corner_button')) {
            let container = document.getElementById('corner-container')
            if (!container) {
                container = document.createElement('div')
                container.id = 'corner-container'
                container.style.position = 'absolute'
                document.body.append(container)
            }
            const button = document.createElement('button')
            button.textContent = 'Web Links Helper'
            button.type = 'button'
            button.onclick = () => {
                button.remove()
                runGroup()
            }
            container.append(button)
            container.style.left = (groupDetails.offsetLeft + groupDetails.offsetWidth - container.scrollWidth) + 'px'
            container.style.top = (groupDetails.offsetTop - container.offsetHeight) + 'px'
        }
    }
}

async function runGroup() {
    GM_addStyle( // language=css
        `
            #wlhelper input[type=url] {
                width: 100%;
            }

            .wlTitle {
                padding-right: 6px;
                white-space: nowrap;
            }

            #wlhelper-links td:nth-of-type(2) {
                width: 100%;
                display: flex;
                flex-direction: column;
            }
            
            #wlhelper .loading {
                color: #736C70
            }

            #wlhelper .notfound {
                color: #937f21
            }
        `)

    if (GM_getValue('columns') && GM_getValue('columns') > 1) {
        GM_addStyle( // language=css
            `
                #wlhelper-links {
                    display: grid;
                    grid-template-columns: repeat(${(GM_getValue('columns'))}, 1fr);
                    row-gap: 6px;
                    column-gap: 15px;
                }

                #wlhelper form {
                    margin: 0 1%;
                }
            `
        )
    } else {
        GM_addStyle( // language=css
            `
                #wlhelper form {
                    width: 80%;
                    margin: 0 auto;
                }

                .wlTitle {
                    text-align: right;
                    width: 1px;
                }
            `
        )
    }

    document.getElementById('grouplinks').insertAdjacentHTML('afterend',
        // language=HTML
        `
            <section id="wlhelper" class="box">
                <div class="head" style="width: 100%;">Web Links Helper</div>
                ${auto_search ? '' : `<button type="button" id="wlhelper-search-all">Search All</button>`}
                <form>
                    ${platform ? `<table style="margin: 0 auto 30px;">
                            <tbody id="wlhelper-reviews" style="display:flex;gap: 2%"></tbody>
                        </table>` : ''}
                    <table>
                        <tbody id="wlhelper-links"></tbody>
                    </table>
                    <input type="submit" style="margin-right: 15px;">
                </form>
            </section>
        `)

    const section = document.getElementById('wlhelper')
    const reviewsBody = document.getElementById('wlhelper-reviews')
    const linksBody = document.getElementById('wlhelper-links')

    const groupTitleParts = platform
        ? / - (.*) \((\d+)\) \[(.*)]/.exec(document.getElementById('groupplatform').nextSibling.textContent)
        : /(.*?)(?:\((\d+)\))?$/.exec(findTextNode(document.getElementById('display_name')).trim())

    groupname = platform ? groupTitleParts[1] : groupTitleParts[1].replace(/(.*) by .*/, '$1').trim()
    setAlternateNames(groupname)

    if (platform) {
        reviewSites.forEach(([name, searchurl, scoreinputid, scoreinputmax, step, urlinputid, pattern]) => {
            const ratingDiv = document.querySelector(`.ratings.${scoreinputid.replace('score', '')}`)
            reviewsBody.insertAdjacentHTML('beforeend',
                // language=HTML
                `
                    <tr>
                        <td class="wlTitle" style="text-align: right;">${name}<br>
                            <a href=${searchurl.replace('NAME', encodedGroupname)}>Search</a>
                        </td>
                        <td>
                            <input type="number" id=${scoreinputid} name=${scoreinputid} min="0" max=${scoreinputmax}
                                   step=${step} value=${ratingDiv?.firstElementChild.textContent ?? ''}>
                            / ${scoreinputmax}
                            <input type="url" id=${urlinputid} name=${urlinputid} pattern=${pattern}
                                   value=${ratingDiv?.parentElement.href.replace('http:', 'https:') ?? ''}>
                        </td>
                    </tr>
                `)
        })
    }

    const specialTitles = new Map([
        ['itchuri', 'Itch'],
        ['rpgneturi', 'RPGnet']
    ])

    function insertRows(sites) {
        sites.forEach(([name, url, id, pattern]) => {
            const title = specialTitles.get(id)
            const sel = title ? title : name.replace(/ /g, '')
            const urlName = url.replace('NAME', id === 'nexusmodsuri' ?
                encodeURIComponent(groupname.replace(/\b([IVX])(X{0,3}I{0,3}|X{0,2}VI{0,3}|X{0,2}I?[VX])(?![A-Za-z'])\b/, '').trim()) // nexus mods search is too strict
                : encodedGroupname)

            const href = document.querySelector(`a[title=${sel}]`)?.href ?? ''
            linksBody.insertAdjacentHTML('beforeend',
                // language=HTML
                `
                    <tr>
                        <td class="wlTitle">${name}
                            <a href=${urlName} target="_blank">[S]
                            </a>
                        </td>
                        <td style="width: 100%;">
                            <input type="url" id=${id} name=${id} ${pattern ? `pattern=${pattern}` : ''} title=${sel}
                                   value=${id === 'gameswebsiteuri' ? href : href.replace('http:', 'https:')}>
                        </td>
                    </tr>
                `)
        })
    }

    if (platform) {
        insertRows(commonSites)
        insertRows(commonGameSites)
        if (!['Pen and Paper RPG', 'Board Game'].includes(platform))
            insertRows(consoleAndPcSites)
        if (['Windows', 'Mac', 'Linux'].includes(platform))
            insertRows(commonPcSites)
        if (['Windows', 'Mac'].includes(platform))
            insertRows(windowsAndMacSites)
        if (['Pen and Paper RPG', 'Board Game', 'Windows', 'Mac', 'Linux'].includes(platform))
            insertRows(pcAndPPrpgSites)
        if (platform === 'Windows')
            insertRows(windowsSites)
        if (['Mac', 'iOS'].includes(platform))
            insertRows(macAndiOSSites)
        if (platform === 'iOS')
            document.getElementById('mobygamesuri').closest('tr').remove() // ?
        if (platform === 'Android')
            insertRows(androidSites)
        if (platform === 'PlayStation 4')
            insertRows(playstation4Sites)
        if (platform === 'Switch')
            insertRows(switchSites)
        if (platform === 'Pen and Paper RPG')
            insertRows(PPrpgSites)
        if (platform === 'Board Game')
            insertRows(boardGameSites)
    } else {
        if (document.querySelector("#group_nofo_bigdiv > div.head").textContent.includes('OST'))
            insertRows(ostSites)
        else {
            insertRows(commonSites)
            insertRows(ebookSites)
        }
    }

    for (const input of section.querySelectorAll('input[type=url]')) {
        input.addEventListener('input', () => {
                if (input.validity.typeMismatch) {
                    input.setCustomValidity('Enter a URL')
                } else if (input.validity.patternMismatch) {
                    input.setCustomValidity('Invalid URL format')
                } else input.setCustomValidity('')
            }
        )
    }

    const form = document.querySelector('#wlhelper form')
    if (auto_search) {
        if (GM_getValue('auto_search_reviews') && platform) {
            if (isAdult)
                insertAdultPresentText(reviewsBody)
            else searchReviews()
        }
        searchSites(groupname, encodedGroupname)
        addUncheckButton(form)
        if (platform)
            addUncheckButton(form, reviewsBody)
    } else {
        addSearchAllButtonHandler(form, reviewsBody)
    }
    addCheckboxesInputHandler(section)
    addSubmitHandler(form, groupTitleParts)
}

function setAlternateNames(groupname) {
    encodedGroupname = encodeURIComponent(groupname)
    groupnameFirstWord = groupname.replace(/[ :].*/, '')
}

function addUncheckButton(form, reviews) {
    if (default_unchecked) return
    const unchecker = document.createElement('button')
    unchecker.type = 'button'
    unchecker.textContent = `Uncheck ${reviews ? 'Reviews' : 'All'}`
    unchecker.style.cssText = `margin-right: 5px;    
    padding: 5px;
    height: 30px;`
    unchecker.onclick = () => {
        (reviews ?? form).querySelectorAll('input[type=checkbox]').forEach(cb => cb.checked = false)
    }

    const submitBtn = form.querySelector('input[type=submit]')
    if (submitBtn.parentElement.tagName !== 'DIV') {
        const div = document.createElement('div')
        div.append(submitBtn)
        div.style.cssText = `margin: 15px auto 0 auto;width: max-content;`
        form.append(div)
    }
    submitBtn.parentElement.append(unchecker)
}

function addSubmitHandler(form, groupTitleParts) {
    const p = []

    function findReviewDetails(url, scoreSelector, scoreInput, urlInput) {
        p.push(promiseXHR(url)
            .then(r => {
                const doc = parseDoc(r)
                const score = doc.querySelector(scoreSelector)
                if (!score) return
                scoreInput.value = score.textContent
                urlInput.value = r.finalUrl
            })
        )
    }

    form.addEventListener('submit', e => {
        const submitBtn = form.querySelector('input[type=submit]')
        submitBtn.value = 'Submitting'
        submitBtn.disabled = true
        e.preventDefault()
        let reviewTable, linksTable
        if (isEditPage) {
            reviewTable = document.getElementById('reviews_table')
            linksTable = document.getElementById('weblinks_edit')
        } else {
            reviewTable = document.getElementById('wlhelper-reviews')
            linksTable = document.getElementById('wlhelper-links')
        }

        if (reviewTable) {
            for (const tr of reviewTable.children) {
                const checked = tr.querySelector('input:checked')
                const scoreInput = tr.querySelector('input[type=number]')
                if (scoreInput.value || !checked) continue
                const checkedHref = checked.previousElementSibling.href
                const urlInput = tr.querySelector('input[type=url]')
                switch (scoreInput.id) {
                    case "meta":
                        const platformMap = new Map([
                            ["Windows", "pc"],
                            ["Mac", "pc"],
                            ["Linux", "pc"],
                            ["PlayStation 1", "playstation"],
                            ["PlayStation 2", "playstation-2"],
                            ["PlayStation 3", "playstation-3"],
                            ["PlayStation 4", "playstation-4"],
                            ["PlayStation 5", "playstation-5"],
                            ["Switch", "nintendo-switch"],
                            ["Wii U", "wii-u"],
                            ["iOS", "ios-iphoneipad"],
                            ["Nintendo DS", "ds"],
                            ["Nintendo 3DS", "3ds"],
                            ["Dreamcast", "dreamcast"],
                            ["Xbox", "xbox"],
                            ["Xbox 360", "xbox-360"],
                            ["PlayStation Portable", "psp"],
                            ["PlayStation Vita", "playstation-vita"],
                            ["Game Boy Advance", "game-boy-advance"],
                            ["Nintendo GameCube", "gamecube"],
                            ["Oculus Quest", "meta-quest"],
                        ])
                        const matchedPlatform = platformMap.get(platform)
                        if (!matchedPlatform) continue
                        findReviewDetails(`${checkedHref}${checkedHref.endsWith('/') ? '' : '/'}critic-reviews/?platform=${matchedPlatform}`, 'div[title*=Metascore]', scoreInput, urlInput)
                        break
                    case "ignscore":
                        findReviewDetails(checkedHref, '.review-score figcaption', scoreInput, urlInput)
                        break
                    case "gamespotscore":
                        findReviewDetails(checkedHref, '.review-ring-score__score', scoreInput, urlInput)
                }
            }
        }

        for (const tr of linksTable.children) {
            const urlInput = tr.querySelector('input[type=url]')
            const checked = tr.querySelector('input:checked')
            if (checked) {
                const url = checked.previousElementSibling.href
                if (urlInput.id === 'gamefaqsuri') {
                    p.push(findGameFaqsPlatformPage(url, platform, urlInput))
                    continue
                }
                urlInput.value = url
            }
            if (!isEditPage && urlInput.value && !document.querySelector(`a[title=${urlInput.title}]`)) // for Collection Crawler to find
                document.body.insertAdjacentHTML('beforeend', `<a href=${urlInput.value} title=${urlInput.title} style="display:none;"></a>`)
        }

        Promise.allSettled(p)
            .then(async () => {
                if (!form.reportValidity()) {
                    submitBtn.value = 'Submit'
                    submitBtn.disabled = false
                    return
                }
                if (isEditPage) {
                    form.submit()
                    return
                }
                const formdata = new FormData(form)
                const ratingMap = new Map([
                    ['3+', '1'],
                    ['7+', '3'],
                    ['12+', '5'],
                    ['16+', '7'],
                    ['18+', '9'],
                    ['N/A', '13'],
                ])
                formdata.append('action', 'nonwikiedit')
                formdata.append('groupid', new URL(location.href).searchParams.get('id'))
                if (!formdata.has('googleplaybooksuri')) {
                    formdata.append('oldyear', groupTitleParts[2])
                    formdata.append('year', groupTitleParts[2])
                }
                if (platform) {
                    formdata.append('rating', groupTitleParts[3])
                    formdata.append('oldrating', ratingMap.get(groupTitleParts[3]))
                    let trailer = ''
                    const trailerElement = document.querySelector('.trailer source') || document.querySelector('iframe') || document.querySelector('a.logo[variant=minimal]')
                    if (trailerElement) {
                        if (trailerElement.src && trailerElement.src !== 'about:blank') {
                            trailer = trailerElement.tagName === 'SOURCE' ? trailerElement.src : `https://youtu.be/${/embed\/(.*)\?/.exec(trailerElement.src)[1]}`
                        } else if (trailerElement.href) {
                            trailer = trailerElement.href
                        }
                    }
                    formdata.append('trailer', trailer)
                }

                // noinspection JSCheckFunctionSignatures
                fetch('torrents.php', {
                    method: 'post',
                    headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                    body: new URLSearchParams(formdata)
                })
                    .then(r => {
                        if (!(r.ok && r.redirected)) throw Error
                        submitBtn.value = 'Submitted'
                        if (GM_getValue('refresh_after_submit')) location.reload()
                    })
                    .catch(e => {
                        console.log(e)
                        submitBtn.disabled = false
                        alert('Failed')
                    })
            })
    })
}

function addSearchAllButtonHandler(form, reviews) {
    document.getElementById('wlhelper-search-all').onclick = e => {
        e.target.disabled = true

        if (platform) {
            if (isAdult) insertAdultPresentText(reviews)
            else {
                searchReviews()
                addUncheckButton(form, reviews)
            }
        } else {
            if (isEditPage && reviews) { // if the platform wasn't retrieved but is editing a game group
                alert('Platform not found. Go to the group page to retrieve it')
                return
            }
        }
        searchSites(groupname, encodedGroupname)
        addUncheckButton(form)
    }
}


function addCheckboxesInputHandler(elem) {
    elem.addEventListener('input', e => {
        const target = e.target
        if (target.type !== 'checkbox' && !target.checked) return
        const tdCheckboxes = target.closest('td').querySelectorAll('input[type=checkbox]')
        for (const checkbox of tdCheckboxes) {
            if (checkbox !== target) {
                checkbox.checked = false
            }
        }
    })
}


const googleSearchSelector = '#search a:has(h3)'

function insertAdultPresentText(reviewsBody) {
    reviewsBody.insertAdjacentHTML('afterend', `<p style="color:antiquewhite;">Group is tagged adult: skipped searching reviews</p>`)
}

/**
 * @param {NodeList|Array} items
 * @param {string} [key]
 */
function throwNotFound(items, key) {
    if (!items || items.length < 1) throw Error('notfound', {cause: 'notfound'})

    if (GM_getValue('check_first_word')) {
        items.length = Math.min(max_results, items.length)
        const lower = groupnameFirstWord.toLowerCase()
        if (Array.from(items).every(item => !(item?.textContent?.toLowerCase().trim() ?? (key ? item[key].toLowerCase() : item.toLowerCase())).startsWith(lower))) {
            throw Error('notfound', {cause: 'notfound'})
        }
    }
}

function searchReviews() {
    searchAndAddElements('metauri', (r, tr, ld) => {
        const ratedGames = r.response.data.items.filter(i => i.criticScoreSummary.score)
        throwNotFound(ratedGames, 'title')

        for (let i = 0; i < Math.min(max_results, ratedGames.length); i++) {
            const {criticScoreSummary: {score}, title, slug} = ratedGames[i]
            setAnchorProperties(addElementsToRow(tr, ld, i), `${title} (${score})`, `https://www.metacritic.com/game/${slug}`)
        }
    }, `https://backend.metacritic.com/v1/xapi/finder/metacritic/search/${encodedGroupname}/web?apiKey=1MOZgmNFxvmljaQR1X9KAij9Mo4xAY3u&mcoTypeId=13&limit=10`, {responseType: "json"})

    searchAndAddElements('ignuri', googleSearchSelector)
    searchAndAddElements('gamespotscoreuri', (r, tr, ld) => {
        const results = r.response.results.filter(i => i.typeName === 'Review')
        throwNotFound(results, 'title')
        for (let i = 0; i < Math.min(max_results, results.length); i++) {
            const {title, dateDisplay, url} = results[i]
            setAnchorProperties(addElementsToRow(tr, ld, i), `${title} (${dateDisplay})`, `https://www.gamespot.com${url}`)
        }
    }, `https://www.gamespot.com/jsonsearch/?header=1&i=reviews&module=autocomplete&q=${encodedGroupname}`, {
        headers: {
            referer: 'https://www.gamespot.com/',
            'Content-Type': 'application/json',
            'x-requested-with': 'XMLHttpRequest'
        },
        responseType: "json",
    })
}

function searchSites(groupname, encodedGroupname) {
    searchAndAddElements('gameswebsiteuri', googleSearchSelector, `https://www.google.com/search?q=${encodedGroupname} -site:store.steampowered.com -site:steamcommunity.com -site:*.wikipedia.org`)
    searchAndAddElements('wikipediauri', (r, tr, ld) => {
        const query = r.response?.query
        throwNotFound(query)
        const pages = Object.values(query.pages).sort((a, b) => a.index - b.index) // sort by relevance
        throwNotFound(pages, 'title')
        for (let i = 0; i < Math.min(max_results, pages.length); i++) {
            setAnchorProperties(addElementsToRow(tr, ld, i), pages[i].title, pages[i].fullurl)
        }
    }, `https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodedGroupname}&prop=info&inprop=url&format=json`, {responseType: "json"})
    searchAndAddElements('giantbomburi', ['li.media a', 'li.media a p.specs'])
    searchVNDB(groupname)
    searchHLTB(groupname)

    searchAndAddElements('amazonuri', '.a-link-normal.s-underline-text.s-underline-link-text.s-link-style.a-text-normal')
    searchAndAddElements('gamefaqsuri', ['.sr_name > a', '.sr_info'])
    searchAndAddElements('mobygamesuri', ['td b a', 'td b + span'])

    searchAndAddElements('steamuri', (r, tr, ld) => {
        const doc = parseDoc(r)
        const anchors = Array.from(doc.querySelectorAll('#search_result_container a'))
        throwNotFound(anchors)
        anchors.forEach(anchor => anchor.href = /.*\/app\/\d+\//.exec(anchor.href)?.[0] ?? anchor.href) // don't want stuff after the number
        const years = doc.querySelectorAll('.col.search_released.responsive_secondrow')
        for (let i = 0; i < Math.min(max_results, anchors.length); i++) {
            setAnchorProperties(addElementsToRow(tr, ld, i), `${findTextNode(anchors[i])}, ${years[i].textContent}`, anchors[i].href)
        }
    })
    searchAndAddElements('goguri', (r, tr, ld) => {
        const products = r.response.products
        throwNotFound(products, 'title')
        for (let i = 0; i < Math.min(max_results, products.length); i++) {
            setAnchorProperties(addElementsToRow(tr, ld, i), products[i].title, products[i].storeLink)
        }
    }, `https://catalog.gog.com/v1/catalog?limit=${max_results}&query=like%3A${encodedGroupname}&systems=${platform === 'Mac' ? 'osx' : platform.toLowerCase()}&productType=in%3Agame`,
        {responseType: "json"})

    searchAndAddElements('humbleuri', (r, tr, ld) => {
        const results = r.response.results
        throwNotFound(results, 'human_name')
        for (let i = 0; i < Math.min(max_results, results.length); i++) {
            setAnchorProperties(addElementsToRow(tr, ld, i), results[i].human_name, `https://www.humblebundle.com/store/${results[i].human_url}`)
        }
    }, `https://www.humblebundle.com/store/api/search?search=${encodedGroupname}&request=1`, {responseType: "json"})

    searchAndAddElements('itchuri', '.game_title a')
    searchAndAddElements('pcwikiuri', (r, tr, ld) => {
        const [, titles, , links] = r.response
        throwNotFound(titles)
        for (let i = 0; i < Math.min(max_results, titles.length); i++) {
            setAnchorProperties(addElementsToRow(tr, ld, i), titles[i], links[i])
        }
    }, `https://www.pcgamingwiki.com/w/api.php?action=opensearch&format=json&formatversion=2&search=${encodedGroupname}`, {responseType: "json"})
    searchAndAddElements('nexusmodsuri', '.mod-image')

    searchAndAddElements('epicgamesuri', googleSearchSelector,
        `https://www.google.com/search?q=site:store.epicgames.com+${encodedGroupname}`)

    searchAndAddElements('psnuri', (r, tr, ld) => {
        const doc = parseDoc(r)
        const titles = doc.querySelectorAll('.sub-grid .search-results__tile__content-title')
        throwNotFound(titles)
        for (let i = 0; i < Math.min(max_results, titles.length); i++) {
            setAnchorProperties(addElementsToRow(tr, ld, i), titles[i].textContent, titles[i].closest('a'))
        }
    })

    searchAndAddElements('googleplayuri', (r, tr, ld) => {
        const doc = parseDoc(r)
        const anchors = doc.querySelectorAll('a[href^="/store/apps"]')
        throwNotFound(anchors)
        for (let i = 0; i < Math.min(max_results, anchors.length); i++) {
            setAnchorProperties(addElementsToRow(tr, ld, i),
                findTextNode(anchors[i]) || findTextNode(anchors[i].nextElementSibling.querySelector('img').nextElementSibling),
                getFullURL(r, anchors[i]))
        }
    })
    searchAndAddElements('nintendouri', googleSearchSelector,
        `https://www.google.com/search?q=site:*nintendo.com OR site:*nintendo.co.uk OR site:*nintendo.co.jp AND inurl:JP OR inurl:ja OR inurl:Games OR inurl:games OR inurl:list ${encodedGroupname}`)

    searchAndAddElements('rpggeekuri', 'a.primary')
    searchAndAddElements('rpgneturi', 'a[href*=mainid')
    searchAndAddElements('drivethrurpguri', (r, tr, ld) => {
            const data = r.response.data
            if (data.length < 1) throw Error('notfound', {cause: 'notfound'})
            for (let i = 0; i < Math.min(max_results, data.length); i++) {
                const {productId, description: {name, slug}} = data[i].attributes
                setAnchorProperties(addElementsToRow(tr, ld, i), name, `https://drivethrurpg.com/product/${productId}/${slug}`)
            }
        }, `https://api.drivethrurpg.com/api/vBeta/products?page=1&groupId=1&keyword=${encodedGroupname}&order%5BmatchWeight%5D=desc&siteId=10&includeRatedContent=true&status=1&partial=false`,
        {responseType: "json"})

    searchAndAddElements('boardgamegeekuri', ['a.primary', '.smallerfont.dull'])

    searchAndAddElements('vgmdburi', (r, tr, ld) => {
        const doc = parseDoc(r)
        const anchors = doc.querySelectorAll('a.albumtitle')
        throwNotFound(anchors)
        for (let i = 0; i < Math.min(max_results, anchors.length); i++) {
            setAnchorProperties(addElementsToRow(tr, ld, i), anchors[i].title, anchors[i].href)
        }
    })
    searchAndAddElements('discogsuri', ['.search_result_title', '.card-artist-name'])
    searchAndAddElements('bandcampuri', (r, tr, ld) => {
        const doc = parseDoc(r)
        const anchors = doc.querySelectorAll('.heading a')
        throwNotFound(anchors)
        const artists = doc.querySelectorAll('.subhead')
        for (let i = 0; i < Math.min(max_results, anchors.length); i++) {
            setAnchorProperties(addElementsToRow(tr, ld, i), anchors[i].textContent + artists[i].textContent, anchors[i].href.replace(/(\?from=.*)/, ''))
        }
    })
    searchAndAddElements('musicbrainzuri', ['.tbl td:nth-child(1) a:nth-of-type(2)', '.tbl td:nth-child(2) a:nth-of-type(1)'])
    searchAndAddElements('itunesuri', googleSearchSelector)

    searchAndAddElements('googleplaybooksuri', 'a:has(div.Epkrse')
    searchAndAddElements('goodreadsuri', ['.bookTitle', '.authorName'])
}

function searchHLTB(groupname) {
    const [tr, loading] = addLoadingToRow('howlongtobeaturi')
    if (!tr) return
    let endpoint = GM_getValue("hltb_endpoint")

    function getEndpoint() {
        return promiseXHR("https://howlongtobeat.com/")
            .then(r => {
                const doc = parseDoc(r)
                const script = doc.querySelector("script[src*=_app]")
                return promiseXHR(`${getFullURL(r, script)}`).then(r => {
                    const a = /fetch\("\/api\/(\w+)\/"\.concat\("([^"]+)"\).concat\("([^"]+)"\)/.exec(r.responseText)
                    const s = `${a[1]}/${a[2] + a[3]}`
                    GM_setValue("hltb_endpoint", s)
                    endpoint = s
                })
            })
    }

    function run() {
        return promiseXHR(`https://howlongtobeat.com/api/${endpoint}`, {
            method: 'POST',
            headers: {
                referer: 'https://howlongtobeat.com',
                'Content-Type': 'application/json'
            },
            responseType: "json",
            data: JSON.stringify({
                "searchType": "games",
                "searchTerms": groupname.split(' '),
                "size": max_results,
                "searchOptions": {
                    "games": {
                        "userId": 0,
                        "platform": "",
                        "sortCategory": "popular",
                        "rangeCategory": "main",
                        "rangeTime": {
                            "min": null,
                            "max": null
                        },
                        "gameplay": {
                            "perspective": "",
                            "flow": "",
                            "genre": "",
                            "difficulty": ""
                        }
                    }
                }
            })
        })
            .then(r => {
                if (r.status === 404) throw Error('endpoint changed')
                if (r.status !== 200) throw Error
                const data = r.response.data
                throwNotFound(data, 'game_name')
                for (let i = 0; i < Math.min(max_results, data.length); i++) {
                    const {game_id, game_name} = data[i]
                    setAnchorProperties(addElementsToRow(tr, loading, i), game_name, `https://howlongtobeat.com/game/${game_id}`)
                }
            })
    }

    if (!endpoint) {
        getEndpoint().then(run)
    } else {
        run().catch(e => {
            if (e?.cause === 'notfound') {
                loading.textContent = 'Nothing Found'
                loading.className = 'notfound'
            } else if (e?.message === 'endpoint changed') {
                loading.textContent = 'Finding new endpoint'
                getEndpoint().then(run)
            } else {
                console.error(e)
                loading.textContent = 'Error'
                loading.style.color = 'red'
            }
        })
    }
}

async function searchVNDB(groupname) {
    const aliases = document.querySelector('#group_aliases strong')
        ?.nextSibling.textContent.split(', ').filter(a => a && !/[A-Z]{2}\d{4,}/.test(a)) // remove empty strings caused by DLsite Code Linkify and remove DLsite codes if without it

    const titles = [groupname, ...aliases || []]
    for (const title of titles) {
        let found = false
        await new Promise(resolve => {
            searchAndAddElements('vndburi', (r, tr, ld) => {
                const results = r.response.results
                if (results.length < 1) {
                    resolve(1)
                    throwNotFound(results, 'title')
                }
                found = true
                results.forEach(({
                                     title,
                                     released,
                                     id
                                 }, j) => setAnchorProperties(addElementsToRow(tr, ld, j), `${title}, ${released}`, `https://vndb.org/${id}`))
                resolve(1)
            }, 'https://api.vndb.org/kana/vn', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                responseType: "json",
                data: JSON.stringify({
                    'filters': ['search', '=', `${title}`],
                    'fields': 'title, released, id, alttitle, titles.title',
                    "sort": "title",
                    'results': max_results
                })
            })
        })
        if (found) return
    }
}

async function findGameFaqsPlatformPage(url, platform, input) {
    const gamefaqsPlatformMap = new Map([
        ["Mac", "Macintosh"],
        ["iOS", "iOS (iPhone/iPad)"],
        ["Apple Bandai Pippin", "Bandai Pippin"],
        ["Apple II", "Apple II"],
        ["Android", "Android"],
        ["DOS", "PC"],
        ["Windows", "PC"],
        ["Xbox", "Xbox"],
        ["Xbox 360", "Xbox 360"],
        ["Game Boy", "Game Boy"],
        ["Game Boy Advance", "Game Boy Advance"],
        ["Game Boy Color", "Game Boy Color"],
        ["NES", "NES"],
        ["Nintendo 64", "Nintendo 64"],
        ["Nintendo 3DS", "3DS"],
        ["New Nintendo 3DS", "3DS"],
        ["Nintendo DS", "DS"],
        ["Nintendo GameCube", "GameCube"],
        ["Pokemon Mini", "Pokemon Mini"],
        ["SNES", "Super Nintendo"],
        ["Switch", "Nintendo Switch"],
        ["Virtual Boy", "Virtual Boy"],
        ["Wii", "Wii"],
        ["Wii U", "Wii U"],
        ["PlayStation 1", "PlayStation"],
        ["PlayStation 2", "PlayStation 2"],
        ["PlayStation 3", "PlayStation 3"],
        ["PlayStation 4", "PlayStation 4"],
        ["PlayStation 5", "PlayStation 5"],
        ["PlayStation Portable", "PSP"],
        ["PlayStation Vita", "PlayStation Vita"],
        ["Dreamcast", "Dreamcast"],
        ["Game Gear", null],
        ["Master System", "Sega Master System"],
        ["Mega Drive", "Genesis"],
        ["Pico", "Sega Pico"],
        ["Saturn", "Saturn"],
        ["SG-1000", "SG-1000"],
        ["Atari 2600", "Atari 2600"],
        ["Atari 5200", "Atari 5200"],
        ["Atari 7800", "Atari 7800"],
        ["Atari Jaguar", "Jaguar"],
        ["Atari Lynx", "Lynx"],
        ["Atari ST", "Atari ST"],
        ["Amstrad CPC", "Amstrad CPC"],
        ["Bandai WonderSwan", "WonderSwan"],
        ["Bandai WonderSwan Color", "WonderSwan Color"],
        ["Commodore 64", "Commodore 64"],
        ["Commodore 128", null],
        ["Commodore Amiga", "Amiga"],
        ["Amiga CD32", "Amiga CD32"],
        ["Commodore Plus-4", null],
        ["Commodore VIC-20", "VIC-20"],
        ["NEC PC-98", "NEC PC98"],
        ["NEC PC-FX", null],
        ["NEC SuperGrafx", null],
        ["NEC TurboGrafx-16", "TurboGrafx-16"],
        ["ZX Spectrum", "Sinclair ZX81/Spectrum"],
        ["MSX", "MSX"],
        ["MSX 2", ""],
        ["Game.com", "Game.com"],
        ["Gizmondo", "Gizmondo"],
        ["V.Smile", null],
        ["CreatiVision", "CreatiVision"],
        ["Board Game", null],
        ["Card Game", null],
        ["Miniature Wargames", null],
        ["Pen and Paper RPG", null],
        ["3DO", "3D0"],
        ["Casio Loopy", "Casio Loopy"],
        ["Casio PV-1000", "Casio PV-1000"],
        ["Colecovision", "Colecovision"],
        ["Emerson Arcadia 2001", "Arcadia 2001"],
        ["Entex Adventure Vision", "Adventurevision"],
        ["Epoch Super Casette Vision", null],
        ["Fairchild Channel F", "Channel F"],
        ["Funtech Super Acan", null],
        ["GamePark GP32", "GP32"],
        ["General Computer Vectrex", "Vectrex"],
        ["Interactive DVD", null],
        ["Linux", "Linux"],
        ["Hartung Game Master", null],
        ["Magnavox-Phillips Odyssey", "Odyssey"],
        ["Mattel Intellivision", "Intellivision"],
        ["Memotech MTX", null],
        ["Miles Gordon Sam Coupe", ""],
        ["Nokia N-Gage", "N-Gage"],
        ["Oculus Quest", "Oculus Quest"],
        ["Ouya", "Ouya"],
        ["Philips Videopac+", null],
        ["Philips CD-i", "CD-I"],
        ["Phone/PDA", "Mobile"],
        ["RCA Studio II", "RCA Studio II"],
        ["Sharp X1", "Sharp X1"],
        ["Sharp X68000", "Sharp X68000"],
        ["SNK Neo Geo", "SNK Neo Geo"],
        ["SNK Neo Geo Pocket", "SNK Neo Geo Pocket"],
        ["Taito Type X", null],
        ["Tandy Color Computer", "Tandy Color Computer"],
        ["Tangerine Oric", "Oric 1/Atmos"],
        ["Thomson MO5", null],
        ["Watara Supervision", "SuperVision"],
        ["Retro - Other", null],
    ])
    const pageResponse = await promiseXHR(url)
    const doc = parseDoc(pageResponse)
    const platformName = doc.querySelector('span.header_more').textContent.trim()
    const matchedPlatform = gamefaqsPlatformMap.get(platform)
    if (matchedPlatform && matchedPlatform === platformName) {
        input.value = url
        return
    }
    const platformLinks = doc.querySelectorAll('#header_more_menu a')
    const platformLink = Array.from(platformLinks).find(a => matchedPlatform === a.textContent.trim())
    if (!platformLink) return
    input.value = getFullURL(pageResponse, platformLink)
}

const parser = new DOMParser()

function parseDoc(response) {
    return parser.parseFromString(response.responseText, 'text/html')
}

function setAnchorProperties(anchor, text, url) {
    anchor.textContent = text.trim()
    anchor.href = url
}

function addElementsToRow(tr, loading, index) {
    loading.remove()
    const label = document.createElement('label')

    if (isEditPage) {
        label.style.maxWidth = '400px'
    }
    label.style.display = 'flex'
    label.style.alignItems = 'center'

    tr.children[1].append(label)
    const anchor = document.createElement('a')
    anchor.target = '_blank'
    anchor.style.flex = '1'
    anchor.style.wordBreak = 'break-all'
    anchor.style.color = '#BBB4B8'
    label.append(anchor)
    label.insertAdjacentHTML('beforeend',
        `<input type="checkbox" style="padding-left: 5px;" ${(index > 0 ? '' : default_unchecked ? '' : 'checked')}>`) // check only first item
    return anchor
}

function addLoadingToRow(id) {
    const tr = document.getElementById(id)?.closest('tr')
    if (!tr) return []
    const urlInput = tr.querySelector('input[type=url]')
    if (urlInput.value && urlInput.pattern) {
        if (new RegExp(urlInput.pattern).test(urlInput.value)) return []
        urlInput.style.outline = '1px solid orange'
    }

    const loading = document.createElement('span')
    loading.textContent = 'Loading'
    loading.className = 'loading'
    tr.children[1].append(loading)
    return [tr, loading]
}

function searchAndAddElements(id, selectorsOrFunction, url, options) {
    const [tr, loading] = addLoadingToRow(id)
    if (!tr) return

    promiseXHR(url ?? tr.firstElementChild.querySelector('a').href, options)
        .then(async res => {
            if (res.status !== 200) {
                console.error(url, res)
                throw Error()
            }
            if (selectorsOrFunction instanceof Function) {
                await selectorsOrFunction(res, tr, loading)
            } else {
                const doc = parseDoc(res)
                const selectedAnchors = (Array.isArray(selectorsOrFunction)
                    && doc.querySelectorAll(selectorsOrFunction[0])) || doc.querySelectorAll(selectorsOrFunction)

                throwNotFound(selectedAnchors)
                for (let i = 0; i < Math.min(max_results, selectedAnchors.length); i++) {
                    let text = findTextNode(selectedAnchors[i])
                    if (Array.isArray(selectorsOrFunction)) {
                        for (let j = 1; j < selectorsOrFunction.length; j++) {
                            const elements = doc.querySelectorAll(selectorsOrFunction[j])
                            const otherText = findTextNode(elements[i])
                            if (otherText)
                                text += ', ' + otherText
                        }
                    }
                    const anchor = addElementsToRow(tr, loading, i)
                    setAnchorProperties(anchor, text, getFullURL(res, selectedAnchors[i]))
                }
            }
        })
        .catch(e => {
            if (e?.cause === 'notfound') {
                loading.textContent = 'Nothing Found'
                loading.className = 'notfound'
            } else {
                console.error(url, e)
                loading.textContent = 'Error'
                loading.style.color = 'red'
            }
        })
}

function findTextNode(node) {
    if (!node) return ''

    if (node.nodeType === 3 && /\S/.test(node.nodeValue)) {
        return node.nodeValue.trim()
    }

    if (node.childNodes.length < 1) return null

    for (const childNode of node.childNodes) {
        const text = findTextNode(childNode)
        if (text) return text
    }

    return null
}

function getFullURL(response, element) {
    const link = element.href ?? element.src
    return link.startsWith('https://gazellegames') ? (new URL(response.finalUrl).origin + link).replace('https://gazellegames.net', '') : link
}

function promiseXHR(url, options) {
    return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
            url,
            ...options,
            onabort: (response) => {
                reject(response)
            },
            onerror: (response) => {
                reject(response)
            },
            ontimeout: (response) => {
                reject(response)
            },
            onload: (response) => {
                resolve(response)
            },
        })
    })
}
