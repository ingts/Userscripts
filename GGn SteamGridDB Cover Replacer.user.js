// ==UserScript==
// @name         GGn SteamGridDB Cover Replacer
// @namespace    none
// @version      2
// @description  Easily replace cover using SteamGridDB images
// @author       ingts
// @match        https://gazellegames.net/torrents.php?id=*
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// ==/UserScript==
const API_key = ''
const max_images = 9

GM_registerMenuCommand('Run', main)

function main() {
    const steamLink = document.querySelector('a[title=Steam]')
    const groupName = / - (.*) \(\d+\) \[.*]/.exec(document.getElementById('groupplatform').nextSibling.textContent)[1]
    GM_xmlhttpRequest({
        url: "https://www.steamgriddb.com/api/v2/" +
            (steamLink
                ? `games/steam/${/\d+/.exec(steamLink.href)[0]}`
                : `search/autocomplete/%22${encodeURIComponent(groupName)}%22`),
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_key}`
        },
        responseType: "json",
        onload: response => {
            loadTitles(groupName, response)
        }
    })
}

function loadTitles(groupName, response) {
    if (!response.response.success) alert('SteamGridDB request failed')
    const data = response.response.data
    console.log(data)
    if (data.length === 0) alert('No results')
    document.getElementById('grouplinks').insertAdjacentHTML('afterend',
        // language=HTML
        `
            <section class="box">
                <div class="head" style="width: 100%;">SteamGridDB Cover Replacer</div>
                <div style="display:flex;flex-wrap: wrap;gap: 5px" id="sgdb-cover"></div>
            </section>
        `)
    const container = document.getElementById('sgdb-cover')
    if (!Array.isArray(data) || data.length === 1) {
        getImages(data, container)
    } else {
        const titleMatch = data.find(item => item.name === groupName)
        if (titleMatch) {
            getImages(titleMatch, container)
            return
        }
        data.forEach(item => {
            const button = document.createElement('button')
            button.textContent = item.name
            button.type = 'button'
            container.append(button)
            button.addEventListener('click', () => {
                container.querySelectorAll('button').forEach(button => button.remove())
                getImages(item, container)
            })
        })
    }
}

function getImages(item, container) {
    console.log(item)
    GM_xmlhttpRequest({
        url: `https://www.steamgriddb.com/api/v2/grids/game/${item.id}?types=static`,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_key}`
        },
        responseType: "json",
        onload: response => loadImages(container, response)
    })
}

function loadImages(container, response) {
    if (!response.response.success) alert('SteamGridDB request failed')
    if (response.response.data.length === 0) alert('No results')
    const sorted = response.response.data.sort((a, b) => b.upvotes - a.upvotes)

    for (let i = 0; i < Math.min(sorted.length, max_images); i++) {
        const item = sorted[i]
        new Promise(resolve => {
            let img = new Image()
            img.src = item.thumb
            img.style.maxWidth = '300px'
            img.style.maxHeight = '400px'
            img.onload = () => resolve(img)
            img.onerror = () => reject()
        }).then(img => {
            const div = document.createElement('div')
            div.style.display = 'flex'
            div.style.flexDirection = 'column'
            div.style.marginLeft = '8px'
            div.style.marginBottom = '4px'
            div.style.alignItems = 'center'

            container.append(div)
            div.insertAdjacentHTML('beforeend', `<span style="font-size: 1.4em;">${item.width} x ${item.height}</span>`)
            div.append(img)
            img.addEventListener('click', () => {
                img.style.outline = '5px solid gray'
                fetch(`https://gazellegames.net/imgup.php?img=${item.url}`)
                    .then(r => r.text())
                    .then(link => {
                        const body = new URLSearchParams(`action=takeimagesedit&groupid=${new URL(location.href).searchParams.get('id')}&categoryid=1&image=${link}`)
                        document.querySelectorAll('#group_screenshots a').forEach(a => body.append('screens[]', a.href))
                        fetch('torrents.php', {
                            method: 'post',
                            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
                            body: body
                        })
                            .then(r => {
                                if (!(r.ok && r.redirected)) {
                                    throw Error
                                }
                                img.style.outlineColor = 'lightgreen'
                            })
                            .catch(() => {
                                img.style.removeProperty('border')
                                alert(`Failed to submit`)
                            })
                    })
                    .catch(() => {
                        alert('PTPimg upload failed')
                    })
            })
        })
    }
}
