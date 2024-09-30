// ==UserScript==
// @name         GGn Epic Games Store Cover Replacer
// @namespace    none
// @version      1
// @description  Easily replace cover using Epic Games Store images
// @author       ingts
// @match        https://gazellegames.net/torrents.php?id=*
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @connect      store.epicgames.com
// @connect      store-content.ak.epicgames.com
// ==/UserScript==

function fillOptions(options = {
    method: "GET",
    responseType: "json",
    headers: {
        referer: 'https://store.epicgames.com/en-US/',
    },
    onSuccess: (response) => {
        return JSON.parse(response.responseText)
    }
}) {
    options.method = options.method || "GET"
    options.responseType = options.responseType || "json"
    if (!options.onSuccess) {
        options.onSuccess = (response) => {
            return JSON.parse(response.responseText)
        }
    }
    return options
}

function doFetch(url, options = {
    method: "GET",
    responseType: "json",
    onSuccess: (response) => {
        return JSON.parse(response.responseText)
    }
}) {
    const fullOptions = fillOptions(options)

    let resolve, reject
    let responsePromise = new Promise((promiseResolve, promiseReject) => {
        resolve = promiseResolve
        reject = promiseReject
    })


    GM_xmlhttpRequest({
        url: url,
        method: fullOptions.method,
        responseType: fullOptions.responseType,
        body: fullOptions.body,
        onload: (response) => {
            if (response.status < 200 || response.status >= 400) {
                console.error(response.responseText, url)
                reject(response)
            } else {
                resolve(fullOptions.onSuccess(response))
            }
        }
    })
    return responsePromise
}

function graphql(query, variables, extensions) {
    const jsonVariables = JSON.stringify(variables)
    const jsonExtensions = JSON.stringify(extensions)
    const url = `https://store.epicgames.com/graphql?operationName=${query}&variables=${jsonVariables}&extensions=${jsonExtensions}`
    return doFetch(url).then(response => response.data)
}

function getProductMapping(slug) {
    return doFetch(`https://store-content.ak.epicgames.com/api/en-US/content/products/${slug}`)
}

function getCatalogOffer(identifiers) {
    const variables = {
        country: "US",
        locale: "en-US",
        sandboxId: identifiers.sandboxId,
        offerId: identifiers.offerId,
    }
    const extensions = {
        persistedQuery: {
            version: 1,
            sha256Hash: "c4ad546ad2757b60ff13ace19ffaf134abb23cb663244de34771a0444abfdf33",
        }
    }

    return graphql("getCatalogOffer", variables, extensions).then(data => data?.Catalog.catalogOffer)
}


GM_registerMenuCommand('Run', () => {
    const egsUrl = document.querySelector('a[title=EpicGames]')
    if (!egsUrl) {
        alert('No Epic Games Store link found')
        return
    }
    const slug = egsUrl.href.split("/").pop()

    const mainDiv = document.createElement('div')
    mainDiv.id = 'egs-cover-main'
    mainDiv.style.cssText = `
        position: absolute;
    width: 250px;
    height: 490px;
    left: 20%;
    top: 0.1%;
    background-color: #2a2b36;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    `
    const loading = document.createElement('p')
    loading.textContent = 'Loading'
    loading.style.fontSize = '2em'
    mainDiv.append(loading)

    const coverDiv = document.getElementById('group_cover')
    coverDiv.after(mainDiv)


    getProductMapping(slug).then(mapping => {
        return {
            sandboxId: mapping.namespace,
            offerId: mapping.pages.find(o => o.type === "productHome").offer.id // could find from data.editions.editions but doesn't work for games that have only 1 edition
        }
    }).then(async identifiers => {
        let tries = 4
        while (tries > 0) {
            const catalog = await getCatalogOffer(identifiers)
            if (!catalog) {
                console.warn('Retrying getCatalogOffer')
                await new Promise(resolve => setTimeout(resolve, 1000))
                tries--
                continue
            }
            return catalog
        }
        mainDiv.remove()
    }).then(catalog => {
        const coverImage = catalog.keyImages.find(image => image.type === "OfferImageTall")?.url
        if (!coverImage) {
            alert('No cover image found')
            return
        }
        new Promise((resolve, reject) => {
            let img = new Image()
            img.src = coverImage
            img.style.maxWidth = '250px'
            img.style.maxHeight = '350px'
            img.onload = () => resolve(img)
            img.onerror = () => reject()
        }).then(img => {
            loading.remove()
            const currentCover = coverDiv.querySelector('img')

            const closeBtn = document.createElement('button')
            closeBtn.textContent = 'Close'
            closeBtn.addEventListener('click', () => mainDiv.style.display = 'none')
            closeBtn.style.alignSelf = 'end'
            mainDiv.append(closeBtn)

            mainDiv.insertAdjacentHTML('beforeend', `
<span style="font-size: 1.1em;">Current: ${currentCover.naturalWidth} x ${currentCover.naturalHeight}</span>
<span style="font-size: 1.1em;">New: ${img.naturalWidth} x ${img.naturalHeight}</span>
`)
            mainDiv.append(img)

            mainDiv.insertAdjacentHTML('beforeend', `
        <input type="text" style="width: 80%;" id="egs-cover-input">
        <button id="egs-cover-submit" type="button">Submit</button>
`)

            const body = new URLSearchParams(`action=takeimagesedit&groupid=${new URL(location.href).searchParams.get('id')}&categoryid=1`)
            document.querySelectorAll('#group_screenshots a').forEach(a => body.append('screens[]', a.href))

            function addText(text) {
                const p = document.createElement('p')
                p.style.textAlign = 'center'
                p.textContent = text
                mainDiv.append(p)
                return p
            }

            function done() {
                const p = document.createElement('p')
                p.style.textAlign = 'center'
                p.textContent = 'Done'
                p.style.cssText = "font-size: 1.5em;color: lightgreen;"
                mainDiv.append(p)
                setTimeout(() => {
                    mainDiv.remove()
                }, 1000)
            }

            document.getElementById('egs-cover-submit').onclick = () => {
                const input = document.getElementById('egs-cover-input')
                body.append('image', input.value)
                submitCover(body).then(() => {
                    done()
                })
            }

            if (coverImage.includes('.jpg') || coverImage.includes('.png')) {
                mainDiv.insertAdjacentHTML('beforeend', `<button id="egs-cover-ptpimg" type="button">PTPImg and Submit</button>`)
                document.getElementById('egs-cover-ptpimg').onclick = () => {
                    function f(url, text) {
                        ptpimg(url)
                            .then(ptpimgLink => {
                                body.append('image', ptpimgLink)
                                submitCover(body).then(() => {
                                    text.remove()
                                    done()
                                })
                            })
                    }

                    const text = addText("Uploading to PTPimg")
                    f(coverImage, text)
                }
            }
        })
    })
})

function ptpimg(url) {
    return fetch(`imgup.php?img=${url}`)
        .then(res => res.text())
        .then(text => {
            if (text === "https://ptpimg.me/.") {
                throw new Error()
            }
            return text
        })
        .catch(() => {
            alert('PTPimg upload failed')
        })
}

function submitCover(body) {
    return fetch('torrents.php', {
        method: 'post',
        headers: {'Content-Type': 'application/x-www-form-urlencoded'},
        body: body
    })
        .then(r => {
            if (!r.redirected) {
                throw Error
            }
        })
        .catch(() => {
            alert(`Failed to submit`)
        })
}