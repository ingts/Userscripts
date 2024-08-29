// ==UserScript==
// @name         GGn Reuploader
// @namespace    none
// @version      1
// @description  Upload torrents to the same group using an existing torrent's details
// @author       dullfool68, ingts
// @match        https://gazellegames.net/torrents.php?id=*
// @match        https://gazellegames.net/torrents.php?action=edit&id=*
// @grant        GM.setValue
// @grant        GM.getValue
// @grant        GM.deleteValue
// @grant        GM.openInTab
// @require
// ==/UserScript==

if (window.location.pathname.includes("upload")) {
    prefillUploadPage()
} else if (window.location.pathname.includes("torrent")) {
    $("tr.group_torrent > td > span > a:last-child").after(function () {
        const torrentId = /id=([0-9]+)/.exec($(this).attr("href"))[1]
        const upload = $("<a/>", {
            text: "UL",
            click: () => handleUploadClick(torrentId),
        })
        return [document.createTextNode(" | "), upload]
    })
}

async function getTorrentFormData(torrentId) {
    const text = await fetch(
        `https://gazellegames.net/torrents.php?action=edit&id=${torrentId}`,
    ).then((response) => response.text())

    const doc = new DOMParser().parseFromString(text, "text/html")
    const formElement = doc.querySelector("form#upload_table")

    if (!formElement) {
        return null
    }

    return new FormData(formElement)
}

async function handleUploadClick(torrentId) {
    const formData = await getTorrentFormData(torrentId)
    if (!formData) {
        console.error("Form Data was null.")
        return
    }

    const groupid = new URL(location.href).searchParams.get('id')

    const FORM_KEYS = [
        "remaster",
        "release_title",
        "miscellaneous",
        "gamedox",
        "gamedoxvers",
        "scan",
        "scan_dpi",
        "other_dpi",
        "isbn",
        "region",
        "language",
        // "ripsrc", scene/other auto selected once title is set
        "remaster_year",
        "remaster_title",
        "format",
        "release_desc",
        "scan_ocr",
        "issue", // e-book
        "bitrate", // OST
        "other_bitrate", // OST
    ]

    await GM.setValue(
        groupid,
        JSON.stringify(
            FORM_KEYS.reduce((acc, cur) => {
                acc[cur] = formData.get(cur)
                return acc
            }, {}),
        ),
    )

    await GM.openInTab(`https://gazellegames.net/upload.php?groupid=${groupid}`, {active: true})
}

async function prefillUploadPage() {
    const groupid = new URL(location.href).searchParams.get('groupid')

    const formData = JSON.parse(
        (await GM.getValue(groupid, "{}")),
    )

    await GM.deleteValue(groupid)

    for (const key of Object.keys(formData)) {
        const inputElement = document.querySelector(`#upload_table [name=${key}]`)
        const value = formData[key]
        if (value === null) continue

        if (inputElement.type === "checkbox") {
            inputElement.checked = true
        } else {
            inputElement.value = value
        }
        if (inputElement.onclick) inputElement.dispatchEvent(new Event('click'))
        if (inputElement.onchange) inputElement.dispatchEvent(new Event('change'))
        if (key === 'scan') {
            const radio = document.getElementById(`${value === 0 ? 'digital' : 'scan'}`)
            radio.checked = true
            radio.dispatchEvent(new Event('click'))
        }
    }
}

