// ==UserScript==
// @name         GGn Title Formatter
// @namespace    none
// @version      28
// @description  Formats title, sets alias if applicable and has buttons to undo. Adds buttons in edit page to format name and alias. Exposes title case function to other scripts
// @author       ingts
// @match        https://gazellegames.net/upload.php
// @match        https://gazellegames.net/torrents.php?id=*
// @match        https://gazellegames.net/torrents.php?action=editgroup&groupid=*
// @match        https://gazellegames.net/upload.php?action=copy&groupid=*
// @exclude      https://gazellegames.net/upload.php?groupid=*
// @grant        unsafeWindow
// ==/UserScript==

let titleInput, aliasInput
const globals = unsafeWindow.TitleAndScreenshotsFormatter = {}
globals.toTitleCase = function (str, alias) {
    const japaneseLowercase = new Map([
        ["ga", ["が", "ガ"]],
        ["no", ["の", "ノ"]],
        ["wa", ["わ", "ワ"]],
        ["mo", ["も", "モ"]],
        ["kara", ["から", "カラ"]],
        ["made", ["まで", "マデ"]],
        ["to", ["と", "ト"]],
        ["ya", ["や", "ヤ"]],
        ["de", ["で", "デ"]],
        ["ni", ["に", "ニ"]],
        ["so", ["そ", "ソ"]],
        ["na", ["な", "ナ"]],
        ["i", ["い", "イ"]],
        ["u", ["う", "ウ"]],
        ["e", ["え", "エ"]],
        ["o", ["お", "オ"]],
        ["san", ["さん"]],
        ["sama", ["さま"]],
        ["kun", ["くん"]],
        ["chan", ["ちゃん"]]
    ])

    const smallWords = /^(a|an|and|as|at|but|by|en|for|if|in|nor|of|on|or|per|the|to|v.?|vs.?|via)$/i
    const alphanumericPattern = /([A-Za-z0-9\u00C0-\u00FF])/
    const wordSeparators = /([ :–—-]|[^a-zA-Z0-9'’])/
    const allUppercase = new Set(['rpg', 'fps', 'tps', 'rts', 'tbs', 'mmo', 'mmorpg', 'arpg', 'jrpg', 'pvp', 'pve', 'ntr', 'td', 'vr', 'npc', 'ost'])

    return str
        .replace(/\s/g, ' ').replace('—', ' - ')
        .replace(/ ~ /, ': ').replace(/ ~/, ': ').replace(/~$/, '').replace(/ ~$/, '').replace(/ - /, ': ').replace(/ -/, ': ').replace(/-$/, '').replace(/^-/, '')
        .replace('™', '').replace('®', '')
        .toLowerCase().trim()
        .split(wordSeparators)
        .map(function (current, index, array) {
            if (allUppercase.has(current.trim()) || /\b([IVX])(X{0,3}I{0,3}|X{0,2}VI{0,3}|X{0,2}I?[VX])(?![A-Za-z'])\b/i.test(current))
                return current.toUpperCase()
            if (alias) {
                const jpWords = japaneseLowercase.get(current)
                if (jpWords && jpWords.some(w => alias.includes(w))) return current
            }
            if (
                /* Check for small words */
                current.search(smallWords) > -1 &&
                /* Skip first and last word */
                index !== 0 &&
                index !== array.length - 1 &&
                /* Ignore title end and subtitle start */
                array[index - 3] !== ':' &&
                array[index + 1] !== ':' &&
                /* Ignore small words that start a hyphenated phrase */
                (array[index + 1] !== '-' ||
                    (array[index - 1] === '-' && array[index + 1] === '-'))
            ) {
                return current
            }
            /* Capitalize the first letter */
            return current.replace(alphanumericPattern, function (match) {
                return match.toUpperCase()
            })
        })
        .join('')
}

function formatText() {
    let origTitle = titleInput.value
    aliasInput = document.getElementById('aliases')
    let origAlias = aliasInput.value

    let titleAfterTitleCase = globals.toTitleCase(titleInput.value, aliasInput.value)
    titleInput.value = titleAfterTitleCase

    if (document.getElementById('categories').value === 'Games') {
        const excludePattern = /[^a-zA-Z0-9 .~?’!@#$%^&*()_+\-=\[\]{};':"\\|,<>\/]+/g
        let excluded = titleInput.value.match(excludePattern)

        if (excluded) {
            if (excluded.length === 1) {
                aliasInput.value ? aliasInput.value += ', ' + excluded.join('') : aliasInput.value = excluded.join('')
                titleInput.value = titleInput.value.replace(excludePattern, "").trim()
            } else {
                aliasInput.value ? aliasInput.value += ', ' + titleInput.value : titleInput.value
                titleInput.value = ''
                startTextFormat(false)
                return
            }
        }
    }

    if (titleAfterTitleCase !== origTitle || aliasInput.value !== origAlias) {
        document.querySelector("#title_tr > td.label").insertAdjacentHTML('beforeend', `<span style="color: #ebaf51;display: block;">Undo Title Formatter</span>
    <div id="tf-undo-buttons"></div>`)

        const buttonDiv = document.getElementById('tf-undo-buttons')

        if (titleAfterTitleCase !== origTitle) {
            const button1 = document.createElement('button')
            button1.textContent = 'Formatting'
            button1.type = 'button'
            button1.onclick = () => {
                titleInput.value = origTitle
            }
            buttonDiv.append(button1)
        }
        if (aliasInput.value !== origAlias) {
            const button2 = document.createElement('button')
            button2.textContent = 'Alias'
            button2.type = 'button'
            button2.onclick = () => {
                titleInput.value = titleAfterTitleCase
                aliasInput.value = origAlias
            }
            buttonDiv.append(button2)
        }
    }
}

function startTextFormat(wait) {
    const tInterval = setInterval(() => {
        if (document.activeElement === titleInput || !titleInput.value)
            return
        clearInterval(tInterval)
        if (wait) {
            // to allow upload scripts that use the title input's value to set the title before formatting
            setTimeout(formatText, 2000)
        } else formatText()
    }, 500)
}

function addButton(input, alias = aliasInput?.value ?? '') {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = 'Format'
    button.addEventListener('click', () => {
        input.value = globals.toTitleCase(input.value, alias)
    })
    input.after(button)
}

if (location.href.includes('upload.php')) {
    titleInput = document.getElementById('title')

    // changing the category changes the form using a server request and the title input is replaced
    document.getElementById('categories').addEventListener('change', () => {
        new MutationObserver((mutations, observer) => {
            titleInput = document.getElementById('title')
            startTextFormat(true)
            observer.disconnect()
        }).observe(document.getElementById('dynamic_form'), {childList: true, subtree: true})
    })
    startTextFormat(true)
} else if (location.href.includes('editgroup')) {
    titleInput = document.querySelector("input[name=name]")
    aliasInput = document.querySelector('input[name=aliases]')
    addButton(aliasInput)
    addButton(titleInput)
} else {
    // wait to make sure the editor helper loads first
    setTimeout(() => {
        const editHelperRename = document.getElementById('titleEdit')

        if (editHelperRename) {
            editHelperRename.addEventListener('click', () => {
                titleInput = document.querySelector("input[name=name]")
                addButton(titleInput, document.getElementById('group_aliases')?.childNodes[2])
            })
        }
    }, 80)
}
