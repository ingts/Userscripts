// ==UserScript==
// @name         GGn Trump Helper (edited)
// @namespace    none
// @description  Trump Helper
// @version      3
// @author       ZeDoCaixao, ingts
// @match        https://gazellegames.net/torrents.php?id=*
// ==/UserScript==

const default_comment = 'new version'
const comment_presets = [
    ["Goodies", "Updated goodies"],
    ["3 latest", "New version (3 latest builds)"],
    ["OST caps", "Properly capitalised tracks"],
]

function handlePlClick(e) {
    e.preventDefault();
    e.currentTarget.classList.toggle("rp_good");
    e.currentTarget.style.removeProperty('color')
    document.querySelectorAll('.rp_good').forEach(link => {
        link.style.color = "red";
    });
    let urls = "";
    document.querySelectorAll('.rp_good').forEach(link => {
        urls += " https://gazellegames.net/" + link.getAttribute("href");
    });
    document.querySelector("#rp_helper #sitelink").value = urls;
}

const allPermalinks = document.querySelectorAll('a[title="Permalink"]')

document.querySelectorAll('a[title="Report"]').forEach(rp => {
    const torrent_id = /&id=([0-9]+)/.exec(rp.href)[1];
    const token = new Date().getTime();
    rp.insertAdjacentHTML('afterend', ` | <a href="javascript:;" title="Trump" id="rp_${torrent_id}">TP`);

    document.querySelector(`#rp_${torrent_id}`).addEventListener('click', e => {
        const rp_helper = document.getElementById('rp_helper')
        if (rp_helper) {
            rp_helper.remove();
            allPermalinks.forEach(pl => {
                pl.removeEventListener('click', handlePlClick)
                pl.classList.remove('rp_good')
                pl.style.removeProperty('color')
            })
        }
        e.currentTarget.closest("tr").insertAdjacentHTML('afterend', `
<tr id="rp_helper"><td>${comment_presets.length > 0 ? '<div style="margin: 0 auto 5px auto; width: 97%;display:flex;gap: 2px;" id="rp_helper_presets"></div>' : ''}
          <form action="/reportsv2.php?action=takereport" enctype="multipart/form-data" method="post" id="report_table">
          <input type="hidden" name="submit" value="true">
          <input type="hidden" name="torrentid" value="${torrent_id}">
          <input type="hidden" name="categoryid" value="1">
          <input type="hidden" name="type" value="trump">
          <input id="sitelink" type="hidden" name="sitelink" size="70" value="">
          <input type="hidden" name="id_token" value="${token}">
          <textarea id="extra" rows="3" cols="60" name="extra"></textarea>
                    <input type="submit" value="Submit report">
          </form><td></tr>`);
        const textarea = document.getElementById('extra')
        textarea.value = default_comment
        const presetsContainer = document.getElementById('rp_helper_presets')
        comment_presets.forEach(preset => {
            let button = document.createElement('button')
            button.type = 'button'
            button.textContent = preset[0]
            button.onclick = () => textarea.value = preset[1]
            presetsContainer.append(button)
        })

        allPermalinks.forEach(pl => {
            pl.addEventListener('click', handlePlClick)
        })
    });
});
