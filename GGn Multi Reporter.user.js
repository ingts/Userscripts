// ==UserScript==
// @name         GGn Multi Reporter
// @namespace    none
// @version      1
// @description  Report multiple torrents using the same details without going to the report page
// @author       ingts
// @match        https://gazellegames.net/torrents.php?id=*
// @grant        GM_addStyle
// ==/UserScript==
GM_addStyle( //language=css
    `
        #multi-rp {
            position: fixed;
            right: 20%;
            top: 5%;
            z-index: 99999;
            padding: 3px 0
        }

        #multi-rp td.label {
            background: unset;
        }

        #multi-rp textarea {
            margin-left: unset;
        }
    `)
const groupDetails = document.getElementById('content')

if (groupDetails) {
    const allPermalinks = document.querySelectorAll('a[title="Permalink"]')
    if (allPermalinks.length > 0) {
        let container = document.getElementById('vertical-corner-container')
        if (!container) {
            container = document.createElement('div')
            container.id = 'vertical-corner-container'
            container.style.position = 'absolute'
            document.body.append(container)
        }
        const button = document.createElement('button')
        button.textContent = 'Multi Report'
        button.type = 'button'
        button.style.writingMode = 'vertical-lr'
        button.style.height = 'unset'
        button.onclick = () => {
            button.remove()
            main(allPermalinks)
        }
        container.append(button)
        container.style.left = (groupDetails.offsetLeft + groupDetails.offsetWidth) + 'px'
        container.style.top = groupDetails.offsetTop + 'px'
    }
}

function main(allPermalinks) {
    let categoryid = 1

    const curlinkedgroup = document.getElementById('curlinkedgroup')
    if (!curlinkedgroup.className) categoryid = 2
    else switch (curlinkedgroup.className) {
        case 'cats_ebooks':
            categoryid = 3
            break
        case 'cats_ost':
            categoryid = 4
            break
    }

    const reportTypes = new Map([
        [1, [['wrong_language', 'Wrong language(s) specified/listed'],
            ['bad_link', 'Bad / missing group link'],
            ['tags_lots', 'Very bad tags / no tags at all'],
            ['discs_missing', 'Files(s) missing'],
            ['wrong_region', 'Wrong specified region'],
            ['bad_title', 'Wrong group title'],
            ['wrong_description', 'Bad description'],
            ['wrong_group', 'Wrong group'],
            ['wrong_releasetype', 'Wrong release type'],]
        ],
        [2, [['missing_crack', 'No Crack/Keygen/Patch'],
            ['collection', 'Collection of Cracks'],
            ['description', 'No Description'],]
        ],
        [3, [['unrelated', 'Unrelated Ebooks'],
            ['wrong_description', 'Bad description'],]
        ],
        [4, [['skips', 'Skips / Encode Errors'],
            ['bitrate', 'Inaccurate Bitrate'],]
        ]
    ])

    const mainDiv = document.createElement('div')
    mainDiv.id = 'multi-rp'
    mainDiv.classList.add('box')
    mainDiv.innerHTML = //language=html
        `
            <form id="report_table" style="padding: 0 3px 0 3px;">
                <div>
                    <input type="hidden" name="submit" value="true">
                    <input type="hidden" name="categoryid" value=${categoryid}>
                    <input type="hidden" name="torrentid" value="${/\d+/.exec(allPermalinks[0].href)[0]}">
                    <input type="hidden" name="id_token" value=${(new Date().getTime())}>
                </div>
                <table>
                    <tbody>
                        <tr>
                            <td class="label">Reason :</td>
                            <td>
                                <select id="type" name="type">
                                    <option value="free">Freely Available</option>
                                    ${reportTypes.get(categoryid).map(i => `<option value="${i[0]}">${i[1]}</option>`)}
                                    ${categoryid === 4 ? '' : `<option value="unmark_trumpable">Unmark trumpable request</option>`}
                                    <option value="urgent">Urgent/malware</option>
                                    <option value="other">Other</option>
                                </select>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div id="dynamic_form">
                    <ul>
                        <li>Please include a link to a source of information or to the freely available content
                            itself.
                        </li>
                    </ul>
                    <br/>
                    <table class='border'>
                        <tr>
                            <td class="label">
                                Link(s) to external
                                source <strong><span style="color: red; ">(Required)</span></strong>
                            <td>
                                <input id="link" type="text" name="link" size="50" value=""/>
                            </td>
                        </tr>
                        <tr>
                            <td class="label">
                                Comments <strong><span style="color: red; ">(Required)</span></strong>
                            </td>
                            <td>
                                <textarea id="extra" rows="2" cols="50" name="extra"></textarea>
                            </td>
                        </tr>
                    </table>
                </div>
                <button type="button" id="rp-all">Select all</button>
                <input type="submit" value="Submit" id="multi-submit">
            </form>
        `
    const options = document.querySelector('.linkbox.groupoptions')
    if (!options.querySelector('#multi-rp'))
        options.after(mainDiv)

    const mainForm = document.getElementById('report_table')
    const dynamicForm = document.getElementById('dynamic_form')
    const typeSelect = document.getElementById('type')

    typeSelect.addEventListener('change', () => {
        fetch('reportsv2.php?action=ajax_report', {method: 'post', body: new FormData(mainForm)})
            .then(r => r.text()).then(t => {
            dynamicForm.innerHTML = t.replace(`rows="5"`, `rows="2"`).replace(`cols="60"`, `cols="50"`)
        })
    })

    allPermalinks.forEach(pl => pl.addEventListener('click', e => {
        e.preventDefault()
        e.currentTarget.classList.toggle("multi_rp_selected")
        e.currentTarget.style.removeProperty('color')
        document.querySelectorAll('.multi_rp_selected').forEach(link => {
            link.style.color = "red"
        })
    }))
    document.getElementById('rp-all').onclick = () => allPermalinks.forEach(pl => pl.dispatchEvent(new Event('click')))
    const submit = document.getElementById('multi-submit')
    submit.addEventListener('click', async e => {
        e.preventDefault()
        submit.disabled = true
        submit.value = 'Submitting'
        const formdata = new FormData(mainForm)

        try {
            for (const pl of document.querySelectorAll('.multi_rp_selected')) {
                const id = /\d+/.exec(pl.href)[0]
                formdata.set('torrentid', id)
                formdata.set('id_token', new Date().getTime())
                await fetch('reportsv2.php?action=takereport', {method: 'post', body: formdata}) // submitting all without waiting for completion causes some to be skipped
                    .then(r => {
                        if (!(r.ok && r.redirected)) throw Error(id)
                    })
            }
            location.reload()
        } catch (id) {
            alert(`Error reporting torrent id ${id}`)
        }
    })
}