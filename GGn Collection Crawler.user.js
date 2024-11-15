// ==UserScript==
// @name         GGn Collection Crawler
// @version      1.1.3.1
// @description  Searches websites found in group page and lists possible collections from their info
// @author       ingts
// @match        https://gazellegames.net/torrents.php?id=*
// @match        https://gazellegames.net/collections.php*
// @match        https://steamdb.info/app/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @grant        GM_openInTab
// @grant        GM_addValueChangeListener
// @grant        GM_removeValueChangeListener
// @connect      store.steampowered.com
// @connect      dlsite.com
// @connect      pcgamingwiki.com
// @connect      api.vndb.org
// @connect      mobygames.com
// @connect      itch.io
// @connect      wikipedia.org
// ==/UserScript==

if (typeof GM_getValue('corner_button') === 'undefined')
    GM_setValue('corner_button', true)
if (typeof GM_getValue('columns') === 'undefined')
    GM_setValue('columns', 3)
if (typeof GM_getValue('refresh_after_submit') === 'undefined')
    GM_setValue('refresh_after_submit', false)
if (typeof GM_getValue('check_SteamDB') === 'undefined')
    GM_setValue('check_SteamDB', true)

let check_SteamDB = GM_getValue('check_SteamDB')

if (location.href.includes('torrents.php?id=') && document.getElementById('groupplatform')) {
    const groupDetails = document.getElementById('content')

    if (groupDetails) {
        GM_registerMenuCommand("Run", () => {
            main()
        })

        if (check_SteamDB) {
            GM_registerMenuCommand("Run (without SteamDB)", () => {
                check_SteamDB = false
                main()
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
            button.textContent = 'Collection Crawler'
            button.type = 'button'
            button.onclick = () => {
                button.remove()
                main()
            }
            container.append(button)
            container.style.left = (groupDetails.offsetLeft + groupDetails.offsetWidth - container.scrollWidth) + 'px'
            container.style.top = (groupDetails.offsetTop - container.offsetHeight) + 'px'
        }
    }
}

if (location.href.includes('collections.php?action=new')) {
    GM_deleteValue('new_collection')
    const form = document.querySelector('#content form')
    form.addEventListener('submit', () => {
        if (['1', '7', '8', '9'].includes(form.querySelector('select').value))
            GM_setValue('new_collection', true)
    })

}

if (location.href.includes('collections.php?id=') && GM_getValue('new_collection', false)) {
    document.querySelector('.header').insertAdjacentHTML('afterbegin', `
    <h1 style="color: #f1c0c0">Tell <a href="/user.php?id=67369">ingts</a> in IRC or PM them about this new collection so that Collection Crawler can be updated</h1> `)
    GM_deleteValue('new_collection')
}

if (location.hostname === "steamdb.info" && GM_getValue('check_steamdb', false)) {
    if (document.getElementById('info')) {
        const info = {}
        const techLink = document.querySelector('tr a[href="/tech/"]')
        if (techLink) {
            info.tech = Array.from(techLink.closest('td').nextElementSibling
                .querySelectorAll('a')).map(a => a.textContent)
        }

        const deckInfo = document.querySelector('ul.app-json')
        if (deckInfo?.firstElementChild.textContent.includes('Verified'))
            info.deckVerified = true
        info.hasLinux = !!document.querySelector('.octicon-linux')

        GM_setValue('steamdb_info', info)
    }
}

async function main() {
    GM_addStyle( // language=css
        `
            #cc label {
                display: flex;
                align-items: center;
            }

            #cc a {
                flex: 1
            }

            #cc input[type=checkbox] {
                margin: 0 3% 0 0;
            }

            #cc-loading {
                font-size: 1.05rem;
                color: #cf9d5e;
            }

            #cc h3 {
                margin-top: 12px;
                font-size: 1.1rem;
                padding: 0;
                grid-column: span ${GM_getValue('columns')};
            }
            
            #cc h3 span {
                font-size: 0.8rem;
                color: #c9aadf;
                font-weight: normal;
            }
            
            #cc h3 span.comma {
                font-size: 0.8rem;
                color: unset;
            }

            #cc div.head span {
                margin-left: 10px;
                color: #79d179;
                font-size: 0.8rem;
            }

            #cc button {
                height: unset;
                padding: 6px;
                width: max-content;
            }
        `)


    document.getElementById('grouplinks').insertAdjacentHTML('afterend',
        // language=html
        `
            <section id="cc" class="box">
                <div class="head" style="width: 100%;">
                    Collection Crawler
                </div>
                <div id="cc-content" style="display: grid;grid-template-columns: repeat(${GM_getValue('columns')}, 1fr);row-gap: 6px"></div>
                <h3 id="cc-loading">Loading</h3>
            </section>
        `)
    const section = document.getElementById('cc')
    const content = document.getElementById('cc-content')
    const header = document.querySelector('#cc div.head')

    const officialSiteLink = document.querySelector("a[title=GamesWebsite]")?.href
    const aliases = document.getElementById('group_aliases')?.textContent
    const DLsiteCodePattern = /[A-Z]{2}\d{4,}/
    const DLsiteAliasMatch = DLsiteCodePattern.exec(aliases)

    const DLsiteCode = DLsiteAliasMatch && DLsiteAliasMatch[0]
        || (officialSiteLink?.includes('dlsite') && DLsiteCodePattern.exec(officialSiteLink)[0])

    const wikipedia = document.querySelector("a[title=Wikipedia]")
    const websites = new Map([
        ["DLsite", DLsiteCode],
        ["Steam", document.querySelector("a[title=Steam]")],
        ["itch.io", document.querySelector("a[title=Itch]")],
        ["MobyGames", document.querySelector("a[title=MobyGames]")],
        ["PCGamingWiki", document.querySelector("a[title=PCGamingWiki]")],
        ["Wikipedia", wikipedia],
        ["VNDB", document.querySelector("a[title=VNDB]")],
    ])

    if (!wikipedia?.href.includes('en.wikipedia'))
        websites.delete("Wikipedia")
    let noLink = true

    websites.forEach((value, key) => {
        if (value) {
            header.insertAdjacentHTML('beforeend', `
<span id="cc-status-${key}">${key}</span>`)
            noLink = false
        }
    })

    if (noLink) {
        document.getElementById('cc-loading').remove()
        section.insertAdjacentHTML('beforeend', '<h1 style="color: red">No supported sites found</h1>')
        return
    }

    // every theme collection except those with GGn in the name, Visual Novels (1792), Hentai Role-Playing Games (11865) as of 2024-11-151. later ones are added only if they can be found
    const themesMap = new Map([
        [49, "MOMA's Video Game Collection"],
        [62, "English Translated Visual Novels"],
        [68, "Touhou Project Fangames"],
        [74, "A Decade In Gaming"],
        [76, "The Ultimate wipEout Music Collection"],
        [84, "The Superlative Suikoden Music Collection"],
        [88, "Classic World of Darkness"],
        [89, "World of Darkness (aka New World of Darkness)"],
        [94, "Neo Geo Online Collection"],
        [102, "Bit.Trip Music Collection"],
        [103, "Undubbed Games"],
        [106, "The Legend of Heroes Music Collection"],
        [130, "LGBTQ Characters in Games"],
        [131, "Isometric (Parallel Projection/Axonometric)"],
        [143, "Low-end PC Games rated above 70% on Metacritic"],
        [152, "Early Access"],
        [155, "Metroidvania"],
        [156, "Free (Freeware) Games"],
        [164, "Crowdfunded"],
        [192, "Tycoon Simulators"],
        [289, "Games Based on TV Shows"],
        [354, "Video games that inspired Uwe Boll"],
        [459, "GLaDOS"],
        [585, "Post-Apocalyptic"],
        [586, "Zombie Games"],
        [623, "Dancing Games"],
        [624, "Political and Government Simulation Games"],
        [673, "World War II"],
        [683, "Virtual Reality (VR) Only"],
        [853, "Games for Non-Gamers"],
        [856, "Female Protagonist"],
        [881, "Denuvo Cracked"],
        [902, "Procedural Generation"],
        [911, "Middle-Earth"],
        [997, "No-Intro"],
        [998, "Redump"],
        [1006, "Automation"],
        [1034, "Multicart Games"],
        [1035, "Denuvo Uncracked"],
        [1049, "[MP3] released soundtracks"],
        [1050, "[FLAC] needed soundtracks"],
        [1062, "Free OSTs"],
        [1072, "Pre-injected CIA Virtual Console Torrents"],
        [1098, "Online Only Games"],
        [1106, "The Magnificent Mega Man Music Medley"],
        [1111, "Sega Forever"],
        [1112, "Denuvo Removed"],
        [1123, "Vaporwave"],
        [1157, "Interactive Movie"],
        [1232, "Japanese Role-Playing Games"],
        [1536, "Games Removed From Steam"],
        [1692, "Native English Visual Novels"],
        [1763, "Games Removed From GOG"],
        [1793, "Eroge (18+)"],
        [1794, "Nukige (18+)"],
        [1989, "H.P. Lovecraft inspired games"],
        [2333, "[UWP] Universal Windows Platform Cracked"],
        [2380, "Permadeath"],
        [2515, "Forgotten Realms"],
        [2832, "Cel shading games"],
        [2862, "Monster Girls"],
        [3025, "World War I"],
        [3031, "Catgirls"],
        [3032, "Yuri"],
        [3033, "Yaoi"],
        [3034, "Kemonomimi"],
        [3035, "Otome"],
        [3039, "Futanari"],
        [3041, "Loli"],
        [3142, "[UWP] Universal Windows Platform Uncracked"],
        [3169, "Steampunk"],
        [3185, "Shota"],
        [3232, "Original Xbox Exclusives"],
        [3267, "PlayStation 2 Exclusives"],
        [3497, "Full Motion Video"],
        [3605, "PlayStation Minis"],
        [3622, "Cyberpunk"],
        [3624, "Final Fantasy Music"],
        [3681, "Games in Black and White"],
        [3721, "Anthropomorphic Animals"],
        [3729, "Games Based on Anime, Manga, or Light Novels"],
        [3813, "Turn Based Combat"],
        [3933, "Free (Libre) Games"],
        [3994, "Vampire"],
        [4033, "ACA Neo Geo"],
        [4086, "Flying"],
        [4138, "Uncensored Games"],
        [4364, "Free Applications"],
        [4365, "Free (Libre) Applications"],
        [4502, "Slice of Life"],
        [4506, "12 days of Christmas 2018"],
        [4624, "Touhou Music"],
        [4859, "Villain Protagonist"],
        [4908, "Scatological"],
        [4924, "Halloween"],
        [5078, "Episodic Story"],
        [5129, "Rape Fantasy (18+)"],
        [5144, "Atmospheric Adventures"],
        [5148, "Out of Early Access"],
        [5160, "Games With an Unofficial English Translation"],
        [5174, "Olympic Games"],
        [5214, "Gender Benders"],
        [5287, "Mecha"],
        [5366, "Female Domination / Dominatrix games (18+)"],
        [5445, "Epic Games Store Exclusives"],
        [5498, "Physics Based Games"],
        [5515, "Middle Ages (Medieval period)"],
        [5690, "Alicesoft Sound Album"],
        [5711, "Souls-Like"],
        [5715, "Sega Mega Drive and Genesis Classics"],
        [5785, "Nakige"],
        [5786, "Utsuge"],
        [5844, "Netorare"],
        [5845, "Netori"],
        [5846, "Netorase"],
        [5940, "Controller Only"],
        [5976, "EA Originals"],
        [6012, "Norse Mythology"],
        [6025, "Asian-Only Games With English Language Support"],
        [6061, "Games With Backer-Created Content"],
        [6109, "Animal Protagonist"],
        [6125, "Western"],
        [6233, "Bestiality (18+)"],
        [6329, "Exa_Pico Universe"],
        [6336, "Nasuverse"],
        [6370, "12 Days of Christmas 2019"],
        [6402, "Pirates"],
        [6440, "Oculus Originals"],
        [6448, "3DCG"],
        [6453, "Dinosaurs"],
        [6550, "PlayStation Vita Exclusives"],
        [6556, "Rail Shooter"],
        [6589, "Games of the Decade"],
        [6646, "Vietnam War"],
        [6693, "God Game"],
        [6701, "Gyaru"],
        [6702, "Magical Girl"],
        [6708, "Surrealism"],
        [6751, "Outer Space"],
        [6803, "Cold War"],
        [6826, "Games Based on Movies"],
        [6829, "Macro Environment"],
        [6865, "Games Removed From Google Play"],
        [6870, "Worlds of power"],
        [7027, "Colorful"],
        [7039, "Card Battler"],
        [7043, "Never-Ending"],
        [7060, "Grappling Hook"],
        [7068, "Homebrew/Late Release"],
        [7079, "Games Removed From Xbox Games Store"],
        [7090, "PlayStation 4 Exclusives"],
        [7113, "Abandonware (for Windows)"],
        [7157, "Games Bundled With Cereal"],
        [7194, "PlayStation 3 Exclusives"],
        [7210, "Train Simulation"],
        [7264, "Alice Sound Collection"],
        [7424, "Street Fighter EX"],
        [7427, "SNK vs. Capcom"],
        [7466, "English Voiced Visual Novels"],
        [7472, "Furry"],
        [7498, "Namco Game Sound Express"],
        [7554, "Indie Live Expo Featured Games"],
        [7563, "Asian exclusive Xbox titles"],
        [7567, "Banned in Australia"],
        [7590, "Nintendo 64 Exclusives"],
        [7628, "Xbox 360 Exclusives"],
        [7674, "Games Featuring Snoop Dogg"],
        [7677, "Evil Ryu Appearances"],
        [7678, "Wu-Tang Clan Appearances"],
        [7694, "Adware as a video game"],
        [7700, "Hulk Hogan Appearances"],
        [7701, "Shaquille O'Neal Appearances"],
        [7713, "Michael Jackson Appearances"],
        [7809, "Polygon Top 100 Best Games of All Time (2017)"],
        [7826, "Cats"],
        [7828, "Edgar Allan Poe inspired games"],
        [7831, "Bara"],
        [7837, "Games with Radio-Controlled Cars"],
        [7870, "Games With an Unofficial Chinese Translation"],
        [7900, "12 Days of Christmas 2020"],
        [7912, "Microphone Required"],
        [7939, "Video Game Soundtracks on Vinyl"],
        [7955, "Art Games"],
        [7996, "Experimental Gameplay"],
        [8035, "Interwar Period"],
        [8036, "Nintendo Switch 2020 Indie Game Highlights"],
        [8061, "PlayStation 2 Classics for PlayStation 4"],
        [8089, "Banned in China"],
        [8091, "Banned in India"],
        [8097, "Games with Decompilation Projects"],
        [8114, "Psychedelia"],
        [8122, "WiiWare"],
        [8136, "Ross's Game Dungeon"],
        [8146, "Namco Video Game Graffiti"],
        [8155, "Dieselpunk"],
        [8194, "Tanks"],
        [8195, "Naval"],
        [8200, "Games Based on Novels"],
        [8307, "Gambling"],
        [8524, "Pre-installed Mac games"],
        [8817, "Pixel Graphics"],
        [8838, "Voxel Art"],
        [8852, "Powered by the Apocalypse"],
        [8913, "Clay Animation"],
        [8933, "Games with Designer's Name in Title"],
        [9150, "Games Based on Comics"],
        [9188, "Alpha/beta builds"],
        [9238, "Ancient Egypt"],
        [9356, "Virtual Console"],
        [9409, "Final Fantasy Pixel Remaster"],
        [9413, "Hissatsu Slot"],
        [9426, "Game Crossovers"],
        [9441, "Dead Before Release"],
        [9452, "Apple Arcade"],
        [9498, "Chernobyl Exclusion Zone"],
        [9617, "Voice Control"],
        [9626, "Nintendo Switch Exclusives"],
        [9628, "Free E-Books"],
        [9666, "Hacking"],
        [9669, "Windows 10 Only"],
        [9693, "Urophilia"],
        [9711, "Halo Novels"],
        [9729, "Mental Disorder"],
        [9772, "Grand Theft Auto: The Trilogy – The Definitive Edition"],
        [9788, "Let's Drown Out"],
        [9805, "Motorcycles"],
        [9814, "Underwater"],
        [9819, "The Powerpuff Girls"],
        [9820, "Moe"],
        [9821, "Ant Games"],
        [9824, "Backgammon Games"],
        [9826, "Sudoku Games"],
        [9831, "Stalin Games"],
        [9837, "Robin Hood "],
        [9838, "Hellboy"],
        [9839, "Truck Games"],
        [9840, "Titanic"],
        [10145, "Dreamcast Exclusives"],
        [10166, "Atari Lynx Collection"],
        [10320, "Machine Translation"],
        [10326, "2.5D"],
        [10342, "Clive Barker"],
        [10392, "Transported to Another World"],
        [10445, "Nonogram"],
        [10464, "Mars"],
        [10481, "V-Tuber (Virtual YouTuber)"],
        [10496, "Native Russian Visual Novels"],
        [10555, "Corruption (18+)"],
        [10563, "Steam Deck Verified"],
        [10638, "Child Protagonist"],
        [10641, "PC Ports by Decompilation"],
        [10666, "Video Game Remakes"],
        [10673, "Native Chinese Visual Novels"],
        [10744, "Biopunk Games"],
        [10858, "Kaiju"],
        [10864, "Epic MegaGrants"],
        [10872, "Vehicular Combat"],
        [10887, "Vertical Shoot 'em ups"],
        [10918, "Native Korean Visual Novels"],
        [10931, "Cosa Nostra"],
        [10934, "Atari Recharged"],
        [10942, "AO-rated video games (ESRB)"],
        [10954, "MoMA: Never Alone - Video Games and Other Interactive Design"],
        [10963, "Reverse Tower Defense"],
        [10964, "Tug of War Strategy"],
        [10965, "Lane Defense"],
        [10966, "Boss Rush"],
        [10970, "(Incremental games with story / Complicated Clicker"],
        [10973, "Hand-drawn graphics"],
        [10980, "Xbox PC Game Pass"],
        [10981, "Point and Click: Adventure games"],
        [10988, "Unsearchable Games"],
        [11152, "Fables Mosaic"],
        [11241, "Found Footage"],
        [11255, "Hentai Expo 2023"],
        [11256, "Hentai Expo 2022"],
        [11261, "Nintendo VS. System"],
        [11272, "HGG2D Translated Game Archive"],
        [11277, "Photography games"],
        [11286, "Games for Learning Japanese"],
        [11289, "Guild 3DS Game Series"],
        [11294, "Games Removed From DLSite"],
        [11296, "Slavic Mythology"],
        [11305, "Banned in Germany"],
        [11320, "Horizontal Shoot 'em ups"],
        [11334, "Modern Board Game Adaptations"],
        [11336, "Censored Games"],
        [11341, "Avoidable Netorare"],
        [11350, "Chibi"],
        [11355, "Kinetic Novels"],
        [11379, "Scott Adams' Graphic Adventure Collection"],
        [11385, "PlayStation Portable Exclusives"],
        [11386, "Sega Saturn Exclusives"],
        [11398, "Space Pirates"],
        [11477, "Games With an Unofficial Korean Translation"],
        [11484, "3d Platformers"],
        [11506, "Deciphering Symbols/Languages/Number Systems"],
        [11519, "My Little Pony Fangames"],
        [11545, "Metal Gear Solid: Master Collection Vol.1"],
        [11546, "Club Nintendo rewards"],
        [11571, "SsethTzeentach's Featured Games"],
        [11615, "Nintendo Gamecube Exclusives"],
        [11642, "Tentacles (18+)"],
        [11751, "Hypnosis (18+)"],
        [11754, "Chikan (18+)"],
        [11769, "Harem"],
        [11770, "Time Stop"],
        [11781, "Wii U Exclusives"],
        [11800, "Set in a Death Game/Battle Royale"],
        [11801, "Combat Sex (18+)"],
        [11805, "Incest"],
        [11808, "Games Based on The Bible"],
        [11811, "Love Triangle"],
        [11820, "Prehistory"],
        [11822, "Unreleased/Cancelled Games (Only Available as Prototypes/Early Beta)"],
        [11827, "Traditional Roguelikes"],
        [11829, "AI Generated Art"],
        [11830, "Asset Flip"],
        [11840, "Wargame"],
        [12086, "Games Based on Folklore/Fables"],
        [12089, "Greek Mythology"],
        [12096, "Vikings"],
        [12098, "Quick Time Events"],
        [12124, "Tricks"],
        [12127, "Twin stick Shoot'em ups"],
        [12146, "Werewolves"],
        [12235, "Political-themed Games"],
        [12236, "Aliens"],
    ])

    const adultThemes = new Set(
        [1793, 1794, 3039, 3041, 3185, 4908, 5129, 5366, 5844, 5845, 5846, 6233, 7831, 11341, 11642, 11751, 11754, 11769, 117770, 11801, 11805,]
    )

    // every feature collection (as of 2023-12-05)
    const featuresMap = new Map([
        [23, "Cracked Online Multiplayer"],
        [39, "Games For Windows: LIVE"],
        [77, "LAN Compatible"],
        [201, "Instrument Controller Support"],
        [472, "2-Player Split Screen Multiplayer"],
        [473, "4-Player Split Screen Multiplayer"],
        [474, "Hackable Split Screen Multiplayer"],
        [475, "Single Screen Hot-Seat Multiplayer"],
        [476, "Single Screen Multiplayer"],
        [551, "Native Controller Support"],
        [559, "Virtual Reality (VR) Support"],
        [628, "NVIDIA 3D Vision Ready"],
        [738, "Oculus Rift Support"],
        [739, "HTC Vive Support"],
        [961, "Co-Op Support"],
        [962, "Local Co-op support"],
        [963, "Local Multiplayer"],
        [968, "OSVR Support"],
        [1074, "EyeToy Support"],
        [1105, "Kinect Support"],
        [1114, "Virtuix Omni Support"],
        [1115, "Cyberith Virtualizer Support"],
        [1116, "Oculus Touch Support"],
        [1117, "Seated VR Support"],
        [1118, "Standing VR Support"],
        [1119, "Room-Scale VR Support"],
        [1409, "Amiibo Support"],
        [1526, "Microtransactions"],
        [1608, "Buzz! buzzers"],
        [1670, "PlayStation Move Support"],
        [1671, "PlayStation Eye Support"],
        [1809, "Windows Mixed Reality Support"],
        [1884, "Tracked Motion Controllers"],
        [2487, "Direct Online Multiplayer"],
        [3345, "Touch-Friendly Desktop Games"],
        [3751, "Long-Wait Turn-Based Multiplayer"],
        [4141, "Tobii Eye Tracking"],
        [4795, "OpenVR"],
        [5200, "Light Gun Support"],
        [5407, "Crossplay LAN compatible"],
        [5679, "Valve Index Support"],
        [5913, "Level Editor"],
        [6823, "PlayStation Camera Support"],
        [6824, "PlayStation VR Support"],
        [6900, "Nvidia RTX Support"],
        [7176, "Massively Multiplayer Online Game"],
        [7339, "PlayLink for PS4"],
        [7477, "Big Head Mode"],
        [7649, "RetroAchievements Compatible"],
        [7671, "Xbox Live Vision"],
        [9461, "Animated Scenes"],
        [9718, "Power Pad/Family Trainer Support"],
        [9787, "Nucleus Co-op supported games"],
        [10393, "DK Bongo controller support "],
        [10604, "NVIDIA DLSS Support"],
        [10653, "Steering Wheel Support"],
        [11091, "uDraw GameTablet Support"],
        [11327, "Pocketstation"],
        [11405, "Dreamcast Live Compatible"],
        [11486, "AMD FSR Support"],
        [11547, "Intel XeSS Support"],
        [11554, "Flying games"]
    ])

    // every franchise collection (as of 2024-09-01)
    const franchises = [
        [3, "Need for Speed "],
        [14, "Doom"],
        [16, "Diablo"],
        [19, "Resident Evil"],
        [29, "The Sims"],
        [32, "Hitman"],
        [42, "Lego"],
        [50, "Sonic the Hedgehog"],
        [52, "The Legend of Zelda"],
        [53, "Final Fantasy"],
        [55, "Mario"],
        [57, "Halo"],
        [58, "Mass Effect"],
        [64, "Castlevania"],
        [65, "Call of Duty"],
        [75, "Pokémon"],
        [87, "Teenage Mutant Ninja Turtles"],
        [91, "Cthulhu Mythos"],
        [96, "James Bond 007"],
        [97, "Black ★ Rock Shooter"],
        [100, "Rayman"],
        [126, "Star Trek"],
        [135, "Star Wars"],
        [179, "The Witcher"],
        [197, "Command & Conquer"],
        [198, "Tomb Raider"],
        [202, "Tom Clancy"],
        [203, "The Walking Dead"],
        [211, "Portal"],
        [215, "Angry Birds"],
        [335, "Gears of War"],
        [343, "Spyro the Dragon"],
        [344, "Crash Bandicoot"],
        [358, "Kirby"],
        [360, "Mega Man"],
        [414, "Dragon Quest"],
        [415, "Dragon Ball"],
        [417, "Mortal Kombat"],
        [420, "Monster Hunter"],
        [421, "Prince of Persia"],
        [428, "Puzzle Bobble"],
        [433, "Barbie"],
        [491, "StarCraft"],
        [498, "Might and Magic"],
        [499, "Total War"],
        [546, "Sakura"],
        [547, "Shadowrun"],
        [571, "Serious Sam"],
        [587, "Hyperdimension Neptunia"],
        [595, "Donkey Kong"],
        [606, "Dune"],
        [610, "One Piece"],
        [618, "Tetris"],
        [631, "Muv-Luv"],
        [643, "Minecraft"],
        [645, "Formula One (F1)"],
        [646, "Metal Slug"],
        [675, "NASCAR"],
        [676, "Batman"],
        [736, "Ghostbusters"],
        [737, "Jurassic Park"],
        [775, "Indiana Jones"],
        [780, "The Matrix"],
        [801, "Megami Tensei"],
        [828, "Alien"],
        [829, "Predator"],
        [830, "Alien vs. Predator"],
        [832, "Back to the Future"],
        [833, "Yakuza"],
        [836, "Yu-Gi-Oh!"],
        [842, "Duke Nukem"],
        [866, "Wario"],
        [868, "Drakengard"],
        [875, "Godzilla"],
        [879, "Hello Kitty"],
        [880, "The Simpsons"],
        [887, "Forza"],
        [896, "Pac-Man"],
        [909, "Spider-Man"],
        [922, "Sailor Moon"],
        [924, "Warcraft"],
        [966, "Game & Watch"],
        [970, "Frogger"],
        [984, "Transformers"],
        [986, "Hatsune Miku"],
        [1013, "Beatmania"],
        [1069, "Fullmetal Alchemist"],
        [1099, "Warhammer 40,000"],
        [1102, "World Rally Championship (WRC)"],
        [1108, "Sega Ages"],
        [1110, "Attack on Titan"],
        [1154, "Mickey Mouse"],
        [1160, "Zork"],
        [1170, "Magic: The Gathering"],
        [1184, "Warriors"],
        [1186, "Dungeons & Dragons"],
        [1375, "Monopoly"],
        [1507, "Discworld"],
        [1519, "South Park"],
        [1531, "The Idolmaster"],
        [1729, "Galapagos RPG"],
        [1802, "Greg Hastings' Paintball"],
        [1850, "JoJo's Bizarre Adventure"],
        [2117, "Warhammer"],
        [2137, "A Kiss for the Petals"],
        [2151, "Sam & Max"],
        [2289, "SteamWorld"],
        [2474, "DC Universe"],
        [2521, "Monster Girl Quest!"],
        [2564, "SpongeBob SquarePants"],
        [2582, "Peanuts"],
        [2606, "Cars"],
        [2773, "Sword Art Online"],
        [2894, "Asterix"],
        [2914, "Looney Tunes"],
        [2999, "Fancy Pants Adventures"],
        [3005, "The House of the Dead"],
        [3036, "Gauntlet"],
        [3155, "Prey"],
        [3243, "Front Mission"],
        [3439, "Brian Lara Cricket"],
        [3453, "Heavy Gear"],
        [3499, "Koihime Musou"],
        [3559, "Dream Club"],
        [3566, "Toy Story"],
        [3625, "Fate"],
        [3717, "Zoids"],
        [3731, "Conan the Barbarian"],
        [3822, "Naruto"],
        [3896, "Fighting Fantasy"],
        [3928, "Pathfinder"],
        [3976, "Rusty Lake"],
        [3996, "Science Adventure"],
        [4090, "Lips"],
        [4452, "Far Cry"],
        [4498, "Ben 10"],
        [4501, "Air Conflicts"],
        [4572, "Galaxian"],
        [4579, "Bibi Blocksberg"],
        [4661, "The Dark Eye"],
        [4967, "Honoo no Haramase"],
        [5030, "Alien Shooter"],
        [5070, "Just Questions"],
        [5181, "Grisaia"],
        [5199, "Kunio Kun (Nekketsu)"],
        [5227, "Battlestar Galactica"],
        [5269, "Rugby League"],
        [5276, "Borderlands"],
        [5336, "Love Live!"],
        [5389, "Disney Infinity"],
        [5400, "Backyard Sports"],
        [5416, "Viva Pinata"],
        [5458, "Hugo"],
        [5469, "Uta no Prince-sama"],
        [5525, "Benjamin the Elephant"],
        [5536, "Asdivine"],
        [5537, "AFL Live"],
        [5546, "My Coach"],
        [5556, "Baldur's Gate"],
        [5563, "Vampire: The Masquerade"],
        [5613, "Yo-kai Watch"],
        [5630, "Dota"],
        [5638, "Mobile Suit Gundam"],
        [5643, "Million Arthur"],
        [5693, "Atelier"],
        [5695, "Inuyasha"],
        [5701, "Blade Runner"],
        [5729, "Neon Genesis Evangelion"],
        [5822, "Lovely x Cation"],
        [5839, "Aneimo"],
        [5977, "This is the Police"],
        [5984, "You Don't Know Jack"],
        [6019, "Loli Dirty Talk"],
        [6028, "When They Cry"],
        [6042, "John Wick"],
        [6060, "Castle of Shikigami"],
        [6102, "Digimon"],
        [6112, "Ice Age"],
        [6117, "Shrek"],
        [6140, "Daisenryaku"],
        [6147, "Dakar"],
        [6170, "Evil Dead"],
        [6175, "Family Guy"],
        [6201, "Aladdin (Disney)"],
        [6202, "The Lion King (Disney)"],
        [6234, "Garfield"],
        [6267, "Fallout"],
        [6276, "Terminator"],
        [6293, "Sega GT"],
        [6349, "Granblue Fantasy"],
        [6387, "CSI: Crime Scene Investigation"],
        [6393, "Venus Blood"],
        [6407, "Hoyle"],
        [6410, "Blair Witch"],
        [6423, "Risk"],
        [6535, "Beyblade"],
        [6552, "Mystery Dungeon"],
        [6665, "Death Note"],
        [6722, "League of Legends"],
        [6752, "Simple"],
        [6766, "Cooking Mama"],
        [6801, "Deadliest Catch"],
        [6806, "Record of Lodoss War"],
        [6816, "Assassin's Creed"],
        [6838, "Amazing Adventures"],
        [6848, "Madness"],
        [6905, "Mechanized Assault & Exploration"],
        [6976, "Blood Bowl"],
        [7019, "Hello Kitty to Issho!"],
        [7066, "World of Tanks"],
        [7078, "M&M's"],
        [7127, "Shopping Clutter"],
        [7134, "Command"],
        [7150, "Dragon Age"],
        [7173, "Fist of the North Star"],
        [7178, "Fast & Furious"],
        [7200, "Shin Nippon Pro Wrestling"],
        [7213, "Siren"],
        [7255, "Wallace & Gromit"],
        [7271, "Pirates of the Caribbean"],
        [7277, "Peter Pan"],
        [7278, "Disney Fairies"],
        [7333, "3-D Ultra"],
        [7414, "Taimanin"],
        [7415, "FIFA"],
        [7422, "Darkstalkers (Vampire Savior)"],
        [7423, "Clayfighter"],
        [7425, "Rival Schools"],
        [7448, "Parodius"],
        [7460, "Pink Panther"],
        [7471, "Steampunk Series"],
        [7478, "Chronicles of Narnia"],
        [7489, "Department Heaven"],
        [7492, "Rance"],
        [7517, "Invizimals"],
        [7542, "BattleTech"],
        [7557, "Cuckolding Report"],
        [7561, "Tom and Jerry"],
        [7566, "Titus the Fox"],
        [7570, "Steel Battalion"],
        [7572, "Hamtaro"],
        [7581, "Inspector Gadget"],
        [7587, "Cabela's"],
        [7598, "J.League licensed video games"],
        [7606, "Master of Monsters"],
        [7613, "NBA"],
        [7616, "MLB"],
        [7621, "NHL"],
        [7636, "Apogee Rescue"],
        [7647, "Hayarigami"],
        [7659, "Zorro"],
        [7692, "Disgaea"],
        [7705, "Cave Story"],
        [7707, "3D Classics (Nintendo)"],
        [7708, "3D Classics (SEGA)"],
        [7722, "Klonoa"],
        [7726, "Skunny"],
        [7732, "Doraemon"],
        [7752, "Cardcaptor Sakura"],
        [7753, "Haruhi Suzumiya"],
        [7754, "Astro Boy"],
        [7755, "Love Hina"],
        [7756, "Detective Conan (Case Closed)"],
        [7757, "Hunter × Hunter"],
        [7758, "Berserk"],
        [7759, "Spice and Wolf"],
        [7760, "Bleach"],
        [7761, "Lucky Star"],
        [7762, "Rozen Maiden"],
        [7763, "Ghost in the Shell"],
        [7764, "Cowboy Bebop"],
        [7765, "Anpanman"],
        [7766, "Lupin the Third"],
        [7767, "Yu Yu Hakusho"],
        [7768, "Captain Tsubasa"],
        [7769, "Inazuma Eleven"],
        [7770, "Zatch Bell!"],
        [7771, "Ranma ½"],
        [7772, "Shaman King"],
        [7773, "Bakugan"],
        [7775, "Golgo 13"],
        [7777, "Azumanga Daioh"],
        [7779, "My Hero Academia"],
        [7780, "Macross"],
        [7781, "Accel World"],
        [7784, "Little Witch Academia"],
        [7841, "Shining"],
        [7843, "Toriko"],
        [7853, "Crayon Shin-chan"],
        [7863, "Leaf Visual Novel Series"],
        [7871, "Story of Seasons"],
        [7880, "PaRappa the Rapper"],
        [7885, "Wizarding World"],
        [7886, "X-Men"],
        [7908, "G.I. Joe"],
        [7915, "Chobits"],
        [7916, "Ashita no Joe"],
        [7917, "Urusei Yatsura"],
        [7918, "Bobobo-bo Bo-bobo"],
        [7919, "Kinnikuman"],
        [7920, "The Seven Deadly Sins"],
        [7921, "The Prince of Tennis"],
        [7922, "Rurouni Kenshin"],
        [7924, "Wing Commander"],
        [7963, "Space Pilgrim Saga"],
        [8021, "My Jigsaw Adventure"],
        [8139, "The Superlatives"],
        [8148, "Alice in Wonderland"],
        [8156, "Police Quest"],
        [8180, "Diva Girls"],
        [8182, "The Smurfs"],
        [8184, "Rugrats"],
        [8186, "Ren & Stimpy"],
        [8234, "Cyanide & Happiness"],
        [8250, "Trivial Pursuit"],
        [8306, "Outlaw Sports"],
        [8528, "Jane's Combat Simulations"],
        [8530, "Rock Band"],
        [8676, "Power Rangers"],
        [8809, "Rambo"],
        [8826, "Monster Jam"],
        [8840, "Street Fighter"],
        [8864, "The Game of Life"],
        [8897, "Sierra Discovery"],
        [8926, "Galaxy Angel"],
        [9019, "Dragonlance"],
        [9100, "Goosebumps"],
        [9138, "Kamen Rider"],
        [9176, "Yoshi"],
        [9203, "Top Gun"],
        [9206, "Spirit"],
        [9216, "Alex Kidd"],
        [9218, "Arthur"],
        [9300, "The Lord of the Rings"],
        [9311, "Princess Maker"],
        [9340, "The Adventures of Tintin"],
        [9341, "Thomas & Friends"],
        [9368, "Paw Patrol"],
        [9395, "Ultraman"],
        [9495, "XIII"],
        [9590, "Spore"],
        [9641, "Hot Wheels"],
        [9662, "Sesame Street"],
        [9686, "Demon Slayer: Kimetsu no Yaiba"],
        [9687, "Sylvanian Families"],
        [9694, "Peppa Pig"],
        [9717, "Super Robot Wars"],
        [9782, "Doctor Who"],
        [9804, "Everquest"],
        [9823, "Xenogears"],
        [9825, "Rocketbirds"],
        [9830, "Awesomenauts"],
        [9833, "Rochard"],
        [9835, "Superman"],
        [9836, "Homeworlds"],
        [9941, "Decisive Campaigns"],
        [9992, "Bob the Builder"],
        [10010, "GeGeGe no Kitarō"],
        [10033, "Hebereke"],
        [10050, "Heiwa"],
        [10051, "Compati Hero"],
        [10114, "Jissen Pachi-Slot Hisshouhou!"],
        [10163, "Tenchi o Kurau"],
        [10312, "Momotaro Dentetsu"],
        [10324, "Glover"],
        [10360, "Count Duckula"],
        [10372, "Hotel Transylvania"],
        [10373, "My Universe"],
        [10380, "Metal Gear"],
        [10386, "Pretty Cure"],
        [10387, "Mermaid Melody Pichi Pichi Pitch"],
        [10388, "Patlabor"],
        [10398, "Saint Seiya"],
        [10459, "Senran Kagura"],
        [10511, "BanG Dream!"],
        [10519, "Dungeon Fighter Online"],
        [10522, "Endless"],
        [10582, "Die Hard "],
        [10667, "Little League World Series Baseball (LLWS)"],
        [10725, "Shovel Knight"],
        [10843, "Utawarerumono"],
        [10860, "Starship Troopers"],
        [10865, "Cardfight!! Vanguard"],
        [10888, "Wildlife Park"],
        [10908, "Caesar's Palace"],
        [10911, "Pachiokun"],
        [10919, "KonoSuba"],
        [11095, "Monster High"],
        [11116, "Tokimeki Memorial"],
        [11271, "Moorhuhn - Crazy Chicken"],
        [11343, "Of Orcs and Men"],
        [11345, "V-Rally"],
        [11351, "Chibi Maruko-chan"],
        [11436, "Conglomerate 5"],
        [11476, "Gintama"],
        [11502, "My Little Pony"],
        [11517, "Puzzle League"],
        [11550, "Ensemble Stars"],
        [11576, "Modern Art"],
        [11850, "Zone of the Enders"],
        [11874, "Sker"],
        [11903, "Age of Empires"],
    ]

    // every engine collection (as of 2024-08-21)
    const enginesMap = new Map([
        ["Creation Engine", 175],
        ["ScummVM", 199],
        ["Unreal Engine", 245],
        ["REDengine", 252],
        ["Chrome Engine", 256],
        ["Rockstar Advanced Game Engine", 261],
        ["Unity", 263],
        ["Source", 265],
        ["Anvil", 290],
        ["CryEngine", 388],
        ["Dunia Engine", 389],
        ["Refractor Engine", 400],
        ["RenderWare", 405],
        ["UbiArt Framework", 410],
        ["LithTech", 412],
        ["Frostbite", 413],
        ["Adventure Game Studio (AGS)", 438],
        ["IW engine", 439],
        ["Build", 487],
        ["Telltale Tool", 507],
        ["PhysX Engine", 508],
        ["Ego Game Technology Engine", 509],
        ["Gamebryo", 510],
        ["Havok", 512],
        ["Multimedia Fusion (Clickteam Fusion)", 516],
        ["PhyreEngine", 520],
        ["Autodesk Stingray Engine", 538],
        ["GameMaker: Studio", 562],
        ["Fox Engine", 583],
        ["Ren'Py", 584],
        ["Monkey X", 588],
        ["4A Engine", 612],
        ["Infinity", 620],
        ["Unigine", 621],
        ["Microsoft XNA", 622],
        ["GoldSrc", 632],
        ["Vision", 634],
        ["Adobe Flash", 657],
        ["Adobe AIR", 658],
        ["Clausewitz Engine", 659],
        ["Irrlicht Engine", 660],
        ["Moai", 661],
        ["Sierra's Creative Interpreter (SCI)", 666],
        ["HPL Engine", 689],
        ["Visionaire", 693],
        ["Serious Engine", 702],
        ["Saber 3D Engine", 705],
        ["Road Hog Engine", 713],
        ["Silk Engine", 766],
        ["FNA", 789],
        ["id Tech 1 (Doom Engine)", 934],
        ["id Tech 2 (Quake Engine)", 935],
        ["id Tech 3 (Quake III Arena Engine)", 936],
        ["id Tech 4 (Doom 3 Engine)", 937],
        ["id Tech 5", 938],
        ["id Tech 6", 939],
        ["Nitrous", 945],
        ["RPG Maker", 1054],
        ["Northlight", 1079],
        ["Snowdrop", 1080],
        ["Dusk of the Gods Engine", 1135],
        ["jMonkeyEngine", 1149],
        ["Construct", 1250],
        ["KiriKiri", 1251],
        ["Crystal Tools", 1252],
        ["Vicious Engine", 1255],
        ["Torque", 1256],
        ["OGRE", 1257],
        ["MT Framework", 1258],
        ["Glacier", 1272],
        ["Virtual Theatre", 1445],
        ["Luminous Studio", 1454],
        ["libGDX", 1458],
        ["Decima", 1652],
        ["HydroEngine", 1835],
        ["DOSBox", 1880],
        ["Shine Engine", 2026],
        ["YU-RIS", 2159],
        ["LWJGL", 2196],
        ["Cocos2d", 2209],
        ["Treyarch NGL", 2219],
        ["Storm3D", 2231],
        ["Dark Alliance Game Engine", 2305],
        ["Jade", 2365],
        ["MonoGame", 2397],
        ["Dagor", 2398],
        ["mkxp", 2406],
        ["Infernal Engine", 2455],
        ["Buddha", 2477],
        ["Visual Novel Maker", 2589],
        ["LÖVE", 2692],
        ["Stencyl", 2708],
        ["Wintermute", 2753],
        ["MADNESS Engine", 2803],
        ["Enigma Engine (Blitzkrieg Engine)", 2877],
        ["YETI", 3105],
        ["ForzaTech", 3165],
        ["Box2D", 3187],
        ["Reaper", 3212],
        ["Quest3d", 3326],
        ["SAGE", 3374],
        ["Godot", 3384],
        ["Retro Engine", 3389],
        ["Nerlaska", 3418],
        ["ONScripter", 3501],
        ["3D Gamestudio", 3515],
        ["Diesel", 3518],
        ["NeoAxis", 3726],
        ["Darkplaces Engine", 3743],
        ["Slayer", 3765],
        ["Iriszoom", 3789],
        ["Wolf RPG Editor", 3818],
        ["Hexa Engine", 3827],
        ["Schmetterling", 3847],
        ["Corona", 3860],
        ["Cobra", 3877],
        ["Warscape", 3923],
        ["Phoenix3D", 4038],
        ["Asura", 4078],
        ["Gem", 4145],
        ["Evolution", 4195],
        ["Sith", 4198],
        ["Adobe Director", 4219],
        ["Apex", 4355],
        ["Wine", 4402],
        ["Ptero-Engine", 4468],
        ["Vector Engine", 4557],
        ["Genome", 4606],
        ["LyN", 4710],
        ["Essence Engine", 4772],
        ["Invictus Engine", 4878],
        ["NintendoWare Bezel Engine", 4911],
        ["RE Engine", 4912],
        ["Bluepoint", 5076],
        ["Real Virtuality", 5093],
        ["VRage", 5101],
        ["CloakNT", 5142],
        ["Iron Engine", 5228],
        ["Heaps", 5265],
        ["Void Engine", 5271],
        ["Vicious Engine 2", 5346],
        ["TheEngine", 5511],
        ["Traktor", 5523],
        ["Slipspace Engine", 5549],
        ["id Tech 7", 5558],
        ["Alchemy", 5575],
        ["Source 2", 5631],
        ["Kex Engine", 5767],
        ["HaxeFlixel", 5852],
        ["retouch", 5866],
        ["RealLive", 5867],
        ["CatSystem2", 5868],
        ["SiglusEngine", 5869],
        ["QLiE", 5873],
        ["Artemis Engine", 5880],
        ["AbbeyCore", 5962],
        ["OpenFL", 5983],
        ["Beard", 5999],
        ["NW.js", 6049],
        ["SCUMM", 6243],
        ["Kt (HD)", 6297],
        ["BlueStacks", 6371],
        ["Spark Casual Engine", 6446],
        ["GlyphX", 6580],
        ["Kt Engine", 6605],
        ["Orochi Engine", 6620],
        ["N2System", 6633],
        ["TOSHI", 6781],
        ["Genie", 6786],
        ["Touhou Danmakufu", 6868],
        ["Voxel Space", 6869],
        ["Open Dynamics Engine", 6884],
        ["TyranoScript", 7072],
        ["Ignite", 7139],
        ["Falco Engine", 7272],
        ["Virtools", 7342],
        ["XnGine", 7444],
        ["Ethornell", 7479],
        ["Nova Engine", 7530],
        ["Wolf3D", 7638],
        ["X-Ray Engine", 7850],
        ["Foundation Engine", 8502],
        ["Disrupt", 8507],
        ["Groovie", 8899],
        ["Titanium", 9139],
        ["Pico-8", 9302],
        ["EntisGLS", 9310],
        ["SystemAoi", 9316],
        ["Litiengine", 9327],
        ["Lectrote", 9335],
        ["Majiro", 9385],
        ["RealSpace", 9499],
        ["Ansel", 9501],
        ["Nsight Aftermath", 9502],
        ["FMOD", 9503],
        ["Adventure Game Interpreter (AGI)", 9543],
        ["Amazon Lumberyard", 9637],
        ["LiveMaker", 9657],
        ["AGOS", 9665],
        ["Dawn Engine", 9714],
        ["CodeX RScript", 9789],
        ["System-NNN", 9843],
        ["Kinetica Engine", 9857],
        ["Freescape", 10149],
        ["Stuff Script Engine", 10321],
        ["Wwise", 10396],
        ["Cinématique", 10408],
        ["Insomniac Engine", 10615],
        ["CTG", 10659],
        ["Defold", 10819],
        ["Omni3D", 10836],
        ["Pygame", 10845],
        ["Inglish", 10848],
        ["GDevelop", 10867],
        ["SoLoud", 11092],
        ["3D Octane", 11114],
        ["Pixel Game Maker MV", 11285],
        ["SRPG Studio", 11335],
        ["Silky Engine", 11372],
        ["OpenAL", 11411],
        ["Blender Game Engine", 11423],
        ["Solar2D", 11458],
        ["VOCALOID", 11523],
        ["Divinity Engine", 11613],
        ["mTropolis", 11815],
        ["Phaser Engine", 11882]
    ])

    const steamThemes = new Map([
        ["free to play", 156],
        ["colorful", 7027],
        ["pixel graphics", 8817],
        ["female protagonist", 856],
        ["physics", 5498],
        ["cyberpunk", 3622],
        ["automation", 1006],
        ["isometric", 131],
        ["procedural generation", 902],
        ["card battler", 7039],
        ["based on a novel", 8200],
        ["zombies", 586],
        ["souls-like", 5711],
        ["dinosaurs", 6453],
        ["pirates", 6402],
        ["perma death", 2380],
        ["cold war", 6803],
        ["2.5d", 10326],
        ["jrpg", 1232],
        ["metroidvania", 155],
        ["atmospheric adventures", 5144],
        ["hand-drawn graphics", 10973],
        ["lovecraftian", 1989],
        ["mechs", 5287],
        ["vehicular combat", 10872],
        ["world war ii", 673],
        ["lgbtq+", 130],
        ["villain protagonist", 4859],
        ["remake", 10666],
        ["vampire", 3994],
        ["cats", 7826],
        ["world war i", 3025],
        ["shoot 'em up", 10887],
        ["shoot 'em up", 11320],
        ["gambling", 8307],
        ["hacking", 9666],
        ["mars", 10464],
        ["clicker", 10970],
        ["surrealism", 6708],
        ["on-rails shooter", 6556],
        ["boss rush", 10966],
        ["voice control", 9617],
        ["steampunk", 3169],
        ["post-apocalyptic", 585],
        ["western", 6125],

        ["space", 6751],
        ["spaceships", 6751],

        ["political", 624],
        ["politics", 624],
        ["political sim", 12235],
        ["diplomacy", 624],

        ["underwater", 9814],
        ["submarine", 9814],

        ["crowdfunded", 164],
        ["kickstarter", 164],

        ["turn-based combat", 3813],
        ["turn-based strategy", 3813],
        ["turn-based tactics", 3813],
        ["turn-based", 3813],

        ["traditional roguelike", 11827],
        ["wargame", 11840],
        ["vikings", 12096],
        ["twin stick shooter", 12127],
        ["werewolves", 12146],
    ])

    // from tags
    const steamFeatures_Tags = new Map([
        ["vr", 559],
        ["level editor", 5913],
        ["co-op campaign", 961],
        ["split screen", 472],
        ["touch-friendly", 3345],

        ["mmorpg", 7176],
        ["massively multiplayer", 7176],
    ])


    // from the sidebar
    const steamFeatures = new Map([
        ["vr only", 683], // will be changed to theme
        ["vr supported", 559],
        ["online co-op", 961],
        ["lan co-op", 962],
        ["lan co-op", 963],
        ["lan pvp", 963],
        ["lan co-op", 77],
        ["shared/split screen pvp", 476],
        ["shared/split screen co-op", 476],
        ["shared/split screen", 476],
        ["tracked controller support", 1884],
        ["in-app purchases", 1526],
        ["includes level editor", 5913],
    ])

    const DLsiteThemes = new Map([
        [431, 8817], // Dot/Pixel
        [432, 856], // Female Protagonist
        [71, 131],// Cross-section View
        [508, 3813], // TRPG
        [240, 6702], // Magical Girl
        [513, 10481], // Vtuber
        [48, 5844], // Cuckoldry (Netorare)
        [302, 5845], // Cuckoldry (Netori)
        [529, 5846], // Cuckoldry (Netorase)
        [159, 9693], // Urination/Peeing
        [8, 4502], // Slice of Life/Daily Living
        [190, 3039], // Futanarii/Hermaphrodite
        [175, 3031], // Nekomimi (Cat Ears)
        [161, 4908], // Scatology
        [414, 586], // Zombie
        [175, 3031], // Nekomimi (Cat Ears)
        [156, 5366], // Submissive Man
        [162, 11642], // Tentacle

        [113, 5129], // Rape
        [115, 5129], // Reverse Rape

        [158, 3032], // Yuri/Girls Love
        [118, 3032], // Female Homosexuality

        [239, 2862], // Ghost
        [317, 2862], // Nonhuman/Monster Girl
        [506, 2862], // Succubus/Incubus
        [184, 2862], // Multi/Monster/Mega Breasts
        [237, 2862], // Angel/Demon

        [303, 5214], // Otoko no ko
        [244, 5214], // Shemale
        [111, 5214], // Cross-dressing as a Woman
        [250, 5214], // Feminization
        [245, 5214], // Sex Change/Transsexual

        [37, 3033], // Boys Love
        [47, 3033], // Yaoi
        [119, 3032], // Male Homosexuality

        [526, 10555], // Pleasure Corruption
        [325, 10555], // Corrupted Morals

        [534, 3185], // Shota
        [211, 3185], // Younger Boy x Elder Girl

        [163, 6233], // Bestiality
        [324, 6233], // Interspecies Sex
        [490, 6233], // Insect Sex
        [239, 6233], // Ghost
        [317, 6233], // Nonhuman/Monster Girl
        [184, 6233], // Multi/Monster/Mega Breasts

        [207, 3041], // Loli
        [531, 3041], // Lolibaba
        [85, 3041], // Gothic Lolita
        [157, 11751], // Trance/Suggestion
        [139, 11754], // Secret Fondling
        [46, 11769], // Harem
        [444, 11770], // Time Stopping
        [533, 11801], // Battle Fuck
        [519 ,10392], // 異世界転生
    ])

    const DlsiteThemesExtra = new Map([
        [115, 5366],
    ])

    // also from tags
    const DLsiteFeatures = new Map([
        [73, 9461],
    ])

    // tag ids from the API are strings that start with 'g'
    const vndbThemes = new Map([
        [1662, 3681], // Black and White
        [68, 585], // Post Apocalyptic Earth
        [57, 6012], // Norse Mythology
        [682, 3622], // Cyberpunk
        [3130, 8817], // Pixel Art
        [684, 11341], // Completely Avoidable Netorare
        [144, 7039], // Strategic Card Battles
        [918, 6125], // Western
        [1205, 8200], // Literary Adaptation
        [3301, 9814], // Underwater
        [3303, 11296], // Slavic Mythology
        [2621, 6109], // Animal Protagonist
        [2856, 6453], // Dinosaurs
        [41, 3813], // Turn-Based Strategy
        [3280, 1989], // Lovecraftian Horror
        [1193, 68], // Touhou
        [647, 673], // World War II
        [1930, 130], // LGBTQ Issues
        [1020, 4859], // Villainous Protagonist
        [23, 1793], // Sexual Content
        [278, 7826], // Cats
        [2876, 3025], // World War I
        [542, 3035], // Otome Game
        [608, 3169], // Steampunk
        [214, 1794], // Nukige
        [2693, 6448], // Pre-rendered 3D Graphics
        [514, 5845], // Netori
        [1325, 4924], // Halloween
        [3846, 6826], // Based on a Movie
        [331, 3031], // Catgirls
        [543, 9666], // Hacking
        [893, 10464], // Mars
        [709, 11355], // Kinetic Novel
        [1813, 11519], // My Little Pony
        [2890, 10858], // Kaiju
        [846, 6708], // Surreal
        [598, 5078], // Episodic Story
        [596, 5785], // Nakige
        [1567, 11277], // Photography Gameplay
        [2180, 10392], // Protagonist from a Different World
        [3579, 10481], // Virtual Youtubers
        [2377, 8195], // Naval Warfare
        [693, 5786], // Utsuge
        [556, 10638], // Child Protagonist

        [302, 624], // Politics
        [773, 624], // Conspiracy
        [957, 624], // Government
        [955, 624], // Rebellion

        [718, 5366], // Female Domination
        [3728, 5366], // Female Domination Only

        [994, 5515], // Medieval Fantasy
        [61, 5515], // Middle Ages Earth
        [301, 5515], // Middle Ages Europe
        [3840, 5515], // Fictional Medieval Japan

        [53, 6751], // Space
        [103, 6751], // Spaceship
        [102, 6751], // Space Station
        [938, 6751], // Starship Combat

        [513, 5844], // Netorare
        [1457, 5844], // Netorare Type A
        [1458, 5844], // Netorare Type B
        [1459, 5844], // Netorare Type C
        [3169, 5844], // Unavoidable Netorare
        [1627, 5844], // Lesbian NTR
        [684, 5844], // Completely Avoidable Netorare

        [752, 7472], // Furry
        [3461, 7472], // Only Furry Heroes
        [3391, 7472], // Only Furry Heroines

        [134, 856], // Female Protagonist
        [1869, 856], // Strong Female Protagonist
        [669, 856], // Loli Protagonist
        [2125, 856], // Ojousama Protagonist
        [3085, 856], // Lesbian Protagonist
        [1046, 856], // Reverse Trap Protagonist
        [2229, 856], // Protagonist as the Only Female

        [892, 2862], // Monster Girl Heroine
        [1420, 2862], // Monster Girl Support Character
        [3418, 2862], // Sex with Monster Girls

        [753, 3034], // Kemonomimi
        [936, 3034], // Kemonomimi Hero
        [474, 3034], // Kemonomimi Heroine
        [1149, 3034], // Kemonomimi Protagonist
        [482, 3034], // Kemonomimi Support Character

        [84, 5129], // Rape
        [2003, 5129], // Rape by Proxy
        [3123, 5129], // Rape by Shota
        [1727, 5129], // Rape Roleplay
        [2181, 5129], // Rape on Defeat
        [2915, 5129], // Rape by Others
        [1391, 5129], // Rape by Deception
        [2507, 5129], // Rape by Possession
        [663, 5129], // Rape with Blackmail
        [1743, 5129], // Rape Involving Drugs
        [3482, 5129], // Rape under Influence
        [1640, 5129], // Monster Rape
        [261, 5129], // Reverse Rape
        [1323, 5129], // Gang Rape
        [2600, 5129], // Anal Rape
        [621, 5129], // Comedy Rape
        [623, 5129], // Lesbian Rape
        [178, 5129], // Tentacle Rape
        [738, 5129], // Male on Male Rape
        [2504, 5129], // Pain Only Rape
        [117, 5129], // Unavoidable Rape
        [2500, 5129], // Low Amount of Rape
        [987, 5129], // Slime Monster Rape
        [511, 5129], // High Amounts of Rape
        [1943, 5129], // Unavoidable Hero Rape
        [574, 5129], // Unavoidable Heroine Rape
        [85, 5129], // Completely Avoidable Rape
        [704, 5129], // Unavoidable Protagonist Rape
        [1944, 5129], // Completely Avoidable Hero Rape
        [575, 5129], // Non-heroine Only Unavoidable Rape
        [3819, 5129], // Completely Unavoidable Hero Rape
        [940, 5129], // Completely Avoidable Heroine Rape
        [2916, 5129], // Heroine Rape by Others
        [3821, 5129], // Completely Unavoidable Heroine Rape
        [1687, 5129], // Completely Avoidable Protagonist Rape
        [3820, 5129], // Completely Unavoidable Protagonist Rape
        [2961, 5129], // Unavoidable Rape by Others
        [2936, 5129], // Side Character Rape by Others
        [2962, 5129], // Unavoidable Heroine Rape by Others
        [2917, 5129], // Completely Avoidable Rape by Others
        [3824, 5129], // Unavoidable Rape by the Protagonist
        [3825, 5129], // Unavoidable Hero Rape by the Protagonist
        [2918, 5129], // Completely Avoidable Heroine Rape by Others
        [2367, 5129], // Unavoidable Heroine Rape by the Protagonist
        [3180, 5129], // Completely Avoidable Rape by the Protagonist

        [3150, 9693], // Pissing
        [3662, 9693], // Internal Pissing
        [3063, 9693], // Pissing on Others
        [2953, 9693], // Pissing on Own Face
        [2158, 9693], // Piss Drinking

        [2026, 586], // Zombie
        [3611, 586], // Zombie Hero
        [486, 586], // Zombie Heroine
        [2828, 586], // Intelligent Zombie

        [82, 3032], // Lesbian Sex
        [2300, 3032], // Yuri Game Jam
        [1627, 3032], // Lesbian NTR
        [623, 3032], // Lesbian Rape
        [1281, 3032], // Group Sex of Several Females
        [3064, 3032], // Lesbian Sex Only
        [97, 3032], // Girl x Girl Romance
        [2272, 3032], // Lesbian Lolicon
        [1986, 3032], // Girl x Girl Romance Only

        [3116, 3729], // Based on a Manga
        [3118, 3729], // Based on a Light Novel
        [3119, 3729], // Based on a Anime

        [969, 6402], // Pirates
        [1907, 6402], // Pirate Hero
        [970, 6402], // Pirate Heroine
        [971, 6402], // Pirate Protagonist

        [377, 5287], // Mecha
        [14, 5287], // Mecha Combat
        [2357, 5287], // Mecha Pilot Hero
        [761, 5287], // Mecha Pilot Heroine
        [764, 5287], // Mecha Pilot Protagonist

        [260, 6702], // Mahou Shoujo Heroine
        [995, 6702], // Mahou Shoujo Protagonist

        [183, 6233], // Bestiality
        [3392, 6233], // Sex with Animals Only
        [988, 6233], // Sex With Monsters
        [3500, 6233], // Sex with Tentacles
        [178, 6233], // Tentacle Rape
        [1606, 6233], // All the Way Through
        [3501, 6233], // Anal Multiple Tentacle Penetration
        [600, 6233], // Consensual Sex Involving Tentacles
        [2301, 6233], // Tailjob
        [3627, 6233], // Tentacles on Male
        [3227, 6233], // Tentacle Blowjob
        [3507, 6233], // Vaginal Multiple Tentacle Penetration
        [1644, 6233], // Consensual Sex With Monsters
        [989, 6233], // Consensual Sex Involving Slime Monsters
        [1640, 6233], // Monster Rape
        [987, 6233], // Slime Monster Rape
        [1422, 6233], // Insemination by Non-Humanoids
        [3283, 6233], // Plant Sex
        [3393, 6233], // Sex With Monsters Only

        [2272, 3041], // Lesbian Lolicon
        [3159, 3041], // Straight Lolicon

        [184, 3185], // Shotacon
        [3123, 3185], // Rape by Shota
        [2046, 3185], // Straight Shotacon
        [2047, 3185], // Gay Shotacon

        [3498, 10555], // Falling to Evil (sexual)
        [3105, 10555], // Sexual Corruption

        [2363, 3039], // Futanari on Futanari
        [2051, 3039], // Futanari on Male
        [413, 3039], // Futanari Heroine
        [2471, 3039], // Futanari on Female
        [1187, 3039], // Futanari Protagonist
        [625, 3039], // Futanari Support Character
        [2444, 3039], //  Male on Futanari
        [3390, 3039], // Only Futanari Heroines

        [5, 3994], // Vampire
        [1113, 3994], // Vampire Hero
        [130, 3994], // Vampire Heroine
        [2122, 3994], // Vampire Hunter Hero
        [1371, 3994], // Vampire Protagonist
        [210, 3994], // Vampire Hunter Heroine
        [2120, 3994], //  Vampire Hunter Protagonist

        [506, 5214], // Gender Bending
        [1247, 5214], // Genderbent Sex

        [454, 4502], // Slice of Life
        [453, 4502], // Slice of Life Drama
        [142, 4502], // Slice of Life Comedy
        [455, 4502], // Slice of Life Realism

        [1170, 7831], // Bara
        [1328, 7831], //  Group Sex of Several Males
        [3065, 7831], //  Male on Male Sex Only
        [3674, 7831], //  Gay Male Domination

        [897, 4908], // Scat
        [2902, 4908], //  Scat Filter
        [3494, 4908], //  Scat on Others

        [2403, 6701], // Gyaru
        [3495, 6701], // Bimbofication

        [3531, 11398], // Space Pirate Hero
        [2569, 11398], // Space Pirate Heroine

        [1663, 5846], // Netorase
        [3832, 5846], // Reverse Netorase

        [531, 11751], // Erotic Mind Control
        [521, 11754], // Chikan

        [434, 11769], // Harem Ending
        [1238, 11769], // Harem Ending with Theme
        [1017, 11769], // Unavoidable Harem Ending

        [1364, 11770], // Time Stop
        [664, 11800], // Battle Royale

        [1341, 11805], // Blood-related Aunt/Nephew Incest
        [1698, 11805], // Blood-related Brother/Brother Incest
        [92, 11805], // Blood-related Brother/Sister Incest
        [3330, 11805], // Blood-related Cousin Incest
        [391, 11805], // Blood-related Father/Daughter Incest
        [1697, 11805], // Blood-related Father/Son Incest
        [1421, 11805], // Blood-related Grandmother/Grandson Incest
        [947, 11805], // Blood-related Mother/Daughter Incest
        [532, 11805], // Blood-related Mother/Son Incest
        [91, 11805], // Blood-related Sister/Sister Incest
        [1522, 11805], // Blood-related Uncle/Niece Incest
        [1296, 11805], // Twincest
        [1942, 11805], // Non-blood-related Brother/Brother Incest
        [95, 11805], // Non-blood-related Brother/Sister Incest
        [1318, 11805], // Non-blood-related Father/Daughter Incest
        [3239, 11805], // Non-blood-related Father/Son Incest
        [1693, 11805], // Non-blood-related Mother/Daughter Incest
        [652, 11805], // Non-blood-related Mother/Son Incest
        [94, 11805], // Non-blood-related Sister/Sister Incest
        [3237, 11805], // Non-blood-related Uncle/Niece Incest
        [1189, 11805], // Brother/Brother Incest
        [1698, 11805], // Blood-related Brother/Brother Incest
        [1942, 11805], // Non-blood-related Brother/Brother Incest
        [89, 11805], // Brother/Sister Incest
        [92, 11805], // Blood-related Brother/Sister Incest
        [95, 11805], // Non-blood-related Brother/Sister Incest
        [1702, 11805], // Father/Daughter Incest
        [391, 11805], // Blood-related Father/Daughter Incest
        [1318, 11805], // Non-blood-related Father/Daughter Incest
        [1708, 11805], // Father/Son Incest
        [1697, 11805], // Blood-related Father/Son Incest
        [3239, 11805], // Non-blood-related Father/Son Incest
        [1703, 11805], // Mother/Daughter Incest
        [947, 11805], // Blood-related Mother/Daughter Incest
        [1693, 11805], // Non-blood-related Mother/Daughter Incest
        [1704, 11805], // Mother/Son Incest
        [532, 11805], // Blood-related Mother/Son Incest
        [652, 11805], // Non-blood-related Mother/Son Incest
        [90, 11805], // Sister/Sister Incest
        [91, 11805], // Blood-related Sister/Sister Incest
        [94, 11805], // Non-blood-related Sister/Sister Incest
        [1705, 11805], // Uncle/Niece Incest
        [1522, 11805], // Blood-related Uncle/Niece Incest
        [3237, 11805], // Non-blood-related Uncle/Niece Incest
        [1706, 11805], // Aunt/Nephew Incest
        [1341, 11805], // Blood-related Aunt/Nephew Incest
        [414, 11805], // Cousin Incest
        [3330, 11805], // Blood-related Cousin Incest
        [1707, 11805], // Grandmother/Grandson Incest
        [1421, 11805], // Blood-related Grandmother/Grandson Incest
        [3305, 11805], // Aunt/Niece Incest
        [1821, 11805], // Grandfather/Granddaughter Incest
        [2206, 11805], // Grandfather/Grandson Incest
        [992, 11805], // Inbreeding
        [3319, 11805], // In-law Incest
        [1809, 11805], // Unbeknown Incest
        [2031, 11805], // Uncle/Nephew Incest

        [336, 11811], // Love Triangle
        [337, 11811], // Dramatic Love Triangle
        [338, 11811], // Comedic Love Triangle

        [3684, 11829], // AI-generated Assets
        [3663, 11829], // AI-generated Graphics

        [1008, 12086], // Fairy Tale
        [58, 12089], // Greek Mythology

        [204, 12146], // Werewolf
        [1136, 12146], // Werewolf Hero
        [1140, 12146], // Werewolf Protagonist
        [1305, 12146], // Werewolf Heroine
    ])

    const vndbThemesExtra = new Map([
        [261, 5366],

        [3500, 11642],
        [178, 11642],
        [3501, 11642],
        [600, 11642],
        [3627, 11642],
        [3227, 11642],
        [3507, 11642],
    ])

    // trait ids from the API are strings that start with 'i'
    const vndbThemes_Traits = new Map([
        [1794, 2862], // Role: Monster Girl
        [2946, 3721], // Body: Anthropomorphic Animal
        [342, 6702], // Role: Mahou Shoujo
        [677, 3034], // Body: Kemonomimi
        [2331, 11398], // Role: Space Pirate

        [1219, 6701], // Clothes: Gyaru
        [2114, 6701], // Clothes: Kuro-Gyaru

        [3411, 11770], // Engages in: Time Stop
        [706, 12146], // Werewolf
    ])

    const itchioThemes = new Map([
        ["female protagonist", 856],
        ["space", 6751],
        ["gay", 3033],
        ["colorful", 7027],
        ["furry", 7472],
        ["artgame", 7955],
        ["medieval", 5515],
        ["surreal", 6708],
        ["metroidvania", 155],
        ["physics", 5498],
        ["procedural generation", 902],
        ["shoot 'em up", 10887],
        ["slice of life", 4502],
        ["cyberpunk", 3622],
        ["otome", 3035],
        ["bara", 7831],
        ["halloween", 4924],
        ["endless", 7043],
        ["isometric", 131],
        ["post-apocalyptic", 585],
        ["zombies", 586],
        ["black and white", 3681],
        ["underwater", 9814],
        ["vampire", 3994],
        ["mechs", 5287],
        ["homebrew", 7068],
        ["remake", 10666],
        ["pirates", 6402],
        ["western", 6125],
        ["lovecraftian horror", 1989],
        ["kinetic novel", 11355],
        ["souls-like", 5711],
        ["touhou", 68],
        ["steampunk", 3169],
        ["flying", 4086],
        ["hacking", 9666],
        ["perma death", 2380],
        ["dinosaurs", 6453],
        ["kickstarter", 164],
        ["episodic", 5078],
        ["world war ii", 673],
        ["world war i", 3025],
        ["norse", 6012],
        ["voice-controlled", 9617],
        ["on-rails shooter", 6556],
        ["lgbt", 130],
        ["queer", 130],
        ["lgbtqia", 130],
        ["transgender", 130],

        ["yuri", 3032],
        ["lesbian", 3032],

        ["clicker", 10970],
        ["idle", 10970],
        ["incremental", 10970],

        ["turn-based", 3813],
        ["turn-based combat", 3813],
        ["turn-based strategy", 3813],

        ["folklore", 12086],
        ["twin stick shooter", 12127],
    ])

    // from tags
    const itchioFeatures = new Map([
        ["local multiplayer", 963],
        ["virtual reality (vr)", 559],
        ["co-op", 961],
        ["controller", 551],
        ["touch-friendly", 3345],
        ["level editor", 5913],
        ["split screen", 472],
        ["oculus rift", 738],

        ["mmorpg", 7176],
        ["massively multiplayer", 7176],
    ])

    // from genres
    const mobygamesThemes = new Map([
        ["gambling", 8307],
        ["isometric", 131],
        ["japanese-style rpg (jrpg)", 1232],
        ["metroidvania", 155],
        ["rail shooter", 6556],
        ["voice control", 9617],
        ["mecha / giant robot", 5287],
        ["vehicular combat", 10872],
        ["cyberpunk / dark sci-fi", 3622],
        ["egypt (ancient)", 9238],
        ["post-apocalyptic", 585],
        ["steampunk", 3169],
        ["western", 6125],
        ["world war i", 3025],
        ["world war ii", 673],

        ["clicker", 10970],
        ["idle", 10970],
        ["incremental", 10970],

        ["japan (ancient/classical/medieval)", 5515],
        ["medieval", 5515],

        ["turn-based", 3813],
        ["turn-based strategy (tbs)", 3813],
        ["turn-based tactics (tbt)", 3813],

        ["prehistoric", 5515],
        ["wargame", 11840],
        ["tricks / stunts", 12124],
    ])

    // IDs are in the url
    // https://www.mobygames.com/group
    const mobygamesThemes_Groups = new Map([
        [11087, 68], // Tōhō (Touhou) Fangames
        [14070, 130], // Theme: LGBT
        [9700, 164], // Crowd Funding (Successful)
        [8038, 586], // Theme: Zombies
        [9654, 12235], // Genre: Simulation - Political
        [712, 856], // Protagonist: Female

        [11581, 902], // Games with music-based procedural generation
        [8817, 902], // Games with randomly generated environments

        [2, 1989], // Inspiration: Author - H. P. Lovecraft
        [10553, 2380], // Gameplay feature: Permadeath / permanent death
        [3043, 2515], // Dungeons & Dragons Campaign Setting: Forgotten Realms
        [5857, 2832], // Visual technique / style: Cel shaded
        [15257, 10145], // Console Generation Exclusives: Dreamcast
        [15477, 11386], // Console Generation Exclusives: Sega Saturn
        [15633, 3232], // Console Generation Exclusives: Xbox
        [15232, 3267], // Console Generation Exclusives: PlayStation 2
        [14766, 7194], // Console Generation Exclusives: PlayStation 3
        [14802, 7090], // Console Generation Exclusives: PlayStation 4
        [15476, 7590], // Console Generation Exclusives: Nintendo 64
        [16401, 7628], // Console Generation Exclusives: Xbox 360
        [18937, 9626], // Console Generation Exclusives: Nintendo Switch
        [18857, 11781], // Console Generation Exclusives: Wii U
        [18857, 7590], // Console Generation Exclusives: Nintendo 64
        [18857, 11615], // Console Generation Exclusives: GameCube
        [6053, 3994], // Theme: Vampires
        [10848, 4924], // Theme: Halloween
        [11484, 5078], // Distribution Method: Episodic
        [1553, 5174], // Theme: Olympics
        [14402, 5976], // EA Originals
        [6157, 6012], // Mythology: Norse / Germanic
        [5990, 6402], // Theme: Sea Pirates
        [6344, 6453], // Animals: Dinosaurs
        [9031, 6693], // Genre: God game

        [12719, 6751], // Setting: Space station / Spaceship
        [9585, 6751], // Genre: Simulation - Space combat
        [9584, 6751], // Genre: Simulation - Space trading and combat

        [9770, 7210], // Genre: Simulation - Train driving
        [7286, 7826], // Animals: Cats
        [4293, 7828], // Inspiration: Author - Edgar Allan Poe
        [9039, 8035], // Setting: Interwar
        [9894, 8155], // Theme: Dieselpunk
        [9200, 8307], // Gameplay feature: Gambling
        [7483, 8838], // Visual technique / style: Voxel graphics
        [8241, 8913], // Visual technique / style: Rendered in clay
        [16676, 9498], // Setting: Chernobyl Exclusion Zone
        [2730, 9666], // Theme: Hacking / Pseudohacking
        [12467, 9814], // Setting: Aquatic / Underwater
        [1537, 9819], // Powerpuff Girls licensees
        [9027, 9824], // Genre: Board game - Backgammon
        [5832, 9826], // Genre: Word / Number Puzzle - Sudoku
        [1501, 9837], // Fictional character: Robin Hood
        [8410, 9838], // Hellboy licensees
        [3212, 9839], // Genre: Truck racing / driving
        [10033, 9840], // Theme: RMS Titanic
        [418, 10342], // Clive Barker licensees
        [8497, 10445], // Genre: Word / Number Puzzle - Nonograms / Picross
        [7614, 10464], // Setting: Mars
        [7966, 10666], // Enhanced remakes
        [18242, 10858], // Theme: Kaiju
        [9635, 10872], // Genre: Car / motorcycle combat
        [9586, 10887], // Genre: Scrolling shoot 'em up
        [10383, 10963], // Genre: Reversed tower defense
        [4916, 11277], // Gameplay feature: Photography
        [17206, 11296], // Mythology: Slavic
        [17440, 11355], // Kinetic visual novels
        [10860, 11519], // My Little Pony fangames

        [9013, 11808], // Bible educational games
        [5165, 11808], // Wisdom Tree's Bible-themed games

        [8755, 11851], // Bridge Construction games
        [6200, 11858], // Historical conflict: American Civil War
        [3557, 9150], // Inspiration: Comics
        [1541, 6826], // Inspiration: Movies
        [9407, 3729], // Manga / anime licensees
        [6335, 12086], // Inspiration: Literature
        [7437, 12089], // Mythology: Greek
        [9161, 12098], // Gameplay feature: Quick Time Events / QTEs
        [9599, 12127], // Genre: Dual / Twin-stick shooter
        [7907, 12146], // Theme: Werewolves
    ])

    // https://www.mobygames.com/attributes/tech-specs
    const mobygamesFeatures = new Map([
        [2421, 4141], // Tobii Eye Tracking
        [138, 551], // Analog Controller
        [3040, 551], // Controller support
        [2025, 551], // GamePad
        [2371, 551], // Gamepad
        [2379, 1884], // Tracked motion controllers
        [2659, 10653], // Racing/Steering Wheel
        [2374, 739], // HTC Vive
        [2559, 1809], // Mixed Reality
        [2375, 738], // Oculus Rift
        [2444, 968], // OSVR
        [3092, 5679], // Valve Index
        [619, 961], // Co-Op
        [156, 476], // Same/Split-Screen
        [2373, 5940], // Input Devices Required - Gamepad (will be changed to theme)
        [2373, 683], // Input Devices Required - VR Helmet/Headset (will be changed to theme)
        [2376, 1117], // Seated
        [2377, 1118], // Standing
        [2378, 1119], // Room-Scale
        [1657, 1526], // In-app/game/skill Purchase
        [1264, 3345], // Touch Screen
    ])

    const mobygamesFeatures_RowLabels = new Map([
        ["Gamepads Supported:", 551], // /attributes/tech-specs/55/
        ["Light Guns / Attachments Supported:", 5200], // /attributes/tech-specs/124/
    ])

    /*
    PCGamingWiki Cargo query values are all strings. Don't need to lowercase
    https://www.pcgamingwiki.com/wiki/Special:CargoTables
    Themes are found in https://www.pcgamingwiki.com/wiki/Category:Taxonomy
    */

    const pcgwThemes = new Map([
        // Genre
        ["Gambling/casino", 8307],
        ["JRPG", 1232],
        ["Metroidvania", 155],
        ["Rail shooter", 6556],
        ["Vehicle combat", 10872],
        ["Wargame", 11840],
        ["Quick time events", 12098],
        ["tricks", 12124],

        ["Tactical RPG", 3813],
        ["TBS", 3813],

        ["Clicker", 10970],
        ["Idle", 10970],

        // Pacing
        ["Turn-based", 3813],

        // Perspective
        ["Isometric", 131],

        // Vehicle
        ["Naval/watercraft", 8195],
        ["Robot", 5287],
        ["Tank", 8194],
        ["Train", 7210],
        ["Truck", 9839],

        // Art style
        ["Cel-shaded", 2832],
        ["Pixel art", 8817],
        ["Voxel art", 8838],

        // Theme
        ["Cold War", 6803],
        ["Cyberpunk", 3622],
        ["Egypt", 9238],
        ["Interwar", 8035],
        ["LGBTQ", 130],
        ["Lovecraftian", 1989],
        ["Medieval", 5515],
        ["Piracy", 6402],
        ["Post-apocalyptic", 585],
        ["Space", 6751],
        ["Steampunk", 3169],
        ["Western", 6125],
        ["World War II", 673],
        ["World War I", 3025],
        ["Zombies", 586],
        ["Prehistoric", 11820],
    ])

    const pcgwFeatures = new Map([ // only match if their value is "true"
        ["Controller support", 551],
        ["Full controller support", 551],
        ["Tracked motion controllers", 1884],
        ["OculusVR", 738],
        ["Windows Mixed Reality", 1809],
        ["Tobii Eye Tracking", 4141],
        ["TrackIR", 1884],
        ["Play area seated", 1117],
        ["Play area standing", 1118],
        ["Play area room scale", 1119],
        ["Ray tracing", 6900],
    ])

    const pcgwFeatures_Substring = [ // match key and value. Values are checked if they are included in the string
        // Local on pcgw means same screen but on Local Multiplayer/Co-op on GGn includes same screen and LAN. Single Screen Multiplayer is added later
        ["Local players", "2", 472],
        ["Local players", "4", 473],
        ["Local modes", "Hot seat", 475],
        ["Local modes", "Co-op", 962],
        ["LAN modes", "Co-op", 963],
        ["Online modes", "Co-op", 961],
        ["Upscaling", "DLSS", 10604],
        ["Upscaling", "FSR", 11486],
    ]

    /** @type {Set<?number>} collection ids */
    const foundThemes = new Set(), foundFeatures = new Set()

    /** @type {String} */
    let foundSeries = ''

    /** @type {Set<?string>} */
    let foundEngines = new Set(), foundDevelopers = new Set(), foundPublishers = new Set(),
        foundDesigners = new Set(), foundComposers = new Set()

    const platform = document.querySelector("#groupplatform > a").textContent.trim()
    const groupnameLower = document.getElementById('groupplatform').nextSibling.textContent.replace(/ - (.*) \(.*\).*/, '$1').toLowerCase()
    const parser = new DOMParser()

    function setErrorStatus(sitename) {
        document.getElementById(`cc-status-${sitename}`).style.color = 'red'
    }

    function parseDoc(response) {
        return parser.parseFromString(response.responseText, 'text/html')
    }

    function getLowercaseTextFromElements(element, selector, sitename = null) {
        const elements = element.querySelectorAll(selector)
        if (!elements) {
            if (sitename) setErrorStatus(sitename)
            return
        }
        return Array.from(elements, a => a.textContent.trim().toLowerCase())
    }

    function addCollectionIds(iterable, collectionsMap, addTo, numbers = false, extraMap) {
        if (iterable.length < 1) return
        if (numbers && typeof iterable[0] === 'string') {
            iterable = Array.from(iterable, str => parseInt(str.replace(/\D/g, '')))
        }
        for (const item of iterable) {
            addTo.add(collectionsMap.get(item))

            if (extraMap) {
                addTo.add(extraMap.get(item))
            }
        }
    }

    function addAllStrings(strings, addTo) {
        strings.forEach(s => {
            addTo.add(s)
        })
    }

    let promises = []
    let earlyAccess

    function processURL(sitename, func, url = websites.get(sitename).href, options = {}) {
        promises.push(promiseXHR(url, options)
            .then(res => {
                if (res.status !== 200) {
                    console.error(res)
                    throw Error()
                }
                func(res, sitename)
            })
            .catch(e => {
                console.error(`${sitename} error ${e}`)
                setErrorStatus(sitename)
            })
        )
    }

    function getNodeByXPath(doc, expr) {
        return doc.evaluate(expr, doc.body,
            null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
    }


    if (websites.get("DLsite")) {
        processURL("DLsite", r => {
            const {genres, maker_name, maker_name_en, site_id, options} = r.response[0]
            const maker = maker_name_en ?? maker_name
            const genreIds = genres.map(i => i.id)
            if (site_id === "girls") foundThemes.add(3035) // Otome
            if (site_id === "bl") foundThemes.add(3033) // Yaoi
            if (options?.includes("AIP")) foundThemes.add(11829) // AI Generated Art
            addCollectionIds(genreIds, DLsiteThemes, foundThemes, true, DlsiteThemesExtra)
            addCollectionIds(genreIds, DLsiteFeatures, foundFeatures, true)
            foundDevelopers.add(maker)
        }, `https://www.dlsite.com/home/api/=/product.json?
        workno=${DLsiteCode}&fields=genres,maker_name,maker_name_en,options`, {
            responseType: "json"
        })
    }

    if (websites.get("Steam")) {
        const steamId = /\d+/.exec(websites.get("Steam").href)[0]

        processURL("Steam", (r, sitename) => {
            const doc = parseDoc(r)
            const tags = getLowercaseTextFromElements(doc, '.glance_tags a', sitename)
            if (!tags) return
            addCollectionIds(tags, steamThemes, foundThemes)
            addCollectionIds(tags, steamFeatures_Tags, foundFeatures)
            if (doc.getElementById('earlyAccessHeader')) earlyAccess = true
        })

        processURL("Steam", r => {
            const {developers, publishers, controller_support, categories: features} = r.response[steamId].data
            addAllStrings(developers, foundDevelopers)
            addAllStrings(publishers, foundPublishers)
            controller_support && foundFeatures.add(551)
            addCollectionIds(features.map(i => i.description.toLowerCase()), steamFeatures, foundFeatures)
        }, `https://store.steampowered.com/api/appdetails?l=en&appids=${steamId}`, {responseType: "json"})

        if (check_SteamDB) {
            promises.push(new Promise(resolve => {
                GM_setValue('check_steamdb', 1)
                const tab = GM_openInTab(`https://steamdb.info/app/${steamId}/info`)
                const listener = GM_addValueChangeListener('steamdb_info', (key, oldValue, newValue) => {
                    GM_removeValueChangeListener(listener)
                    GM_deleteValue('check_steamdb')
                    tab.close()
                    const {tech, deckVerified, hasLinux} = newValue
                    if (deckVerified) { // only add if linux supported and on linux group or linux isn't supported and on windows group
                        if (hasLinux) {
                            if (platform === 'Linux') foundThemes.add(10563)
                        } else if (platform === 'Windows') foundThemes.add(10563)
                    }
                    GM_deleteValue(key)
                    resolve(1)
                    if (!tech) return
                    const engines = tech
                        .filter(i => i.startsWith('Engine.') || i.startsWith('Emulator.'))
                        .map(i => i.replace(/^.*?\./, '').replace('RenPy', "ren'py"))
                    addAllStrings(engines, foundEngines)

                    const sdks = tech.filter(i => i.startsWith('SDK.')).map(i => i.replace(/^.*?\./, ''))
                    const sdkEngines = new Map([
                        ["NWJS", "NW.js"],
                        ["NVIDIA PhysX", "PhysX Engine"],
                        ["WWise", "Wwise"],
                        ["Adobe Flash", "Adobe Flash"],
                        ["OpenAL", "OpenAL"],
                    ])
                    const sdkFeatures = new Map([
                        ["NVIDIA DLSS", 10604],
                        ["Tobii", 4141],
                        ["Intel XeSS", 11547],
                        ["AMD FSR2", 11486],
                    ])
                    sdks.forEach(t => {
                        foundEngines.add(sdkEngines.get(t))
                        foundFeatures.add(sdkFeatures.get(t))
                    })
                })
            }))
        }
    }

    if (websites.get("itch.io")) {
        processURL("itch.io", (r, sitename) => {
            const doc = parseDoc(r)
            const tags = getLowercaseTextFromElements(doc, 'a[href*=tag-]', sitename)
            if (!tags) return
            addCollectionIds(tags, itchioThemes, foundThemes)
            addCollectionIds(tags, itchioFeatures, foundFeatures)

            const authors = getNodeByXPath(doc, ".//table//td[contains(text(), 'Author')]").nextElementSibling
            authors.querySelectorAll('a').forEach(a => {
                foundDevelopers.add(a.textContent)
            })

            const madeWithTd = getNodeByXPath(doc, ".//table//td[text()='Made with']")
            if (madeWithTd) {
                const madeWith = getLowercaseTextFromElements(madeWithTd.nextElementSibling, 'a', sitename)
                    .filter(t => t !== 'blender')  // not Blender Game Engine
                addAllStrings(madeWith, foundEngines)
            }
        })
    }

    if (websites.get("MobyGames")) {
        processURL("MobyGames", (r, sitename) => {
            const doc = parseDoc(r)
            const tags = getLowercaseTextFromElements(doc, '.info-genres dd a', sitename)
            if (!tags) return
            const platformMap = new Map([
                ["Mac", "Macintosh"],
                ["Apple II", "Apple II"],
                ["iOS", "iPhone"],
                ["Apple Bandai Pippin", "Pippin"],
                ["Android", "Android"],
                ["DOS", "DOS"],
                ["Windows", "Windows"],
                ["Xbox", "Xbox"],
                ["Xbox 360", "Xbox360"],
                ["Game Boy", "Gameboy"],
                ["Game Boy Advance", "Game Boy Advance"],
                ["Game Boy Color", "Game Boy Color"],
                ["NES", "NES"],
                ["Nintendo 64", "Nintendo 64"],
                ["Nintendo 3DS", "intendo 3DS"],
                ["New Nintendo 3DS", "New Nintendo 3DS"],
                ["Nintendo DS", "Nintendo DS"],
                ["Nintendo GameCube", "GameCube"],
                ["Pokemon Mini", "Pokémon Mini"],
                ["SNES", "SNES"],
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
                ["PlayStation Vita", "PS Vita"],
                ["Dreamcast", "Dreamcast"],
                ["Game Gear", "Game Gear"],
                ["Master System", "SEGA Master System"],
                ["Mega Drive", "Genesis"],
                ["Pico", "SEGA Pico"],
                ["SG-1000", "SG-1000"],
                ["Saturn", "SEGA Saturn"],
                ["Atari 2600", "Atari 2600"],
                ["Atari 5200", "Atari 5200"],
                ["Atari 7800", "Atari 7800"],
                ["Atari Jaguar", "Jaguar"],
                ["Atari Lynx", "Lynx"],
                ["Atari ST", "Atari ST"],
                ["Amstrad CPC", "Amstrad CPC"],
                ["ZX Spectrum", "Zx Spectrum"],
                ["MSX", "MSX"],
                ["3DO", "3DO"],
                ["Bandai WonderSwan", "WonderSwan"],
                ["Bandai WonderSwan Color", "WonderSwan Color"],
                ["Colecovision", "ColecoVision"],
                ["Interactive DVD", "DVD Player"],
                ["Commodore 64", "Commodore 64"],
                ["Commodore 128", "Commodore 128"],
                ["Amiga CD32", "Amiga CD32"],
                ["Commodore Amiga", "Amiga"],
                ["Commodore Plus-4", "Commodore 16, Plus/4"],
                ["Commodore VIC-20", "VIC-20"],
                ["NEC PC-98", "PC-98"],
                ["NEC SuperGrafx", "SuperGrafx"],
                ["Game.com", "Game.Com"],
                ["Gizmondo", "Gizmondo"],
                ["V.Smile", "V.Smile"],
                ["CreatiVision", "CreatiVision"],
                ["Linux", "Linux"],
                ["Mattel Intellivision", "Intellivision"],
                ["NEC PC-FX", "PC-FX"],
                ["NEC TurboGrafx-16", "TurboGrafx-16"],
                ["Nokia N-Gage", "N-Gage"],
                ["Ouya", "Ouya"],
                ["Sharp X1", "Sharp X1"],
                ["Sharp X68000", "Sharp X68000"],
                ["SNK Neo Geo", "Neo Geo"],
                ["Tangerine Oric", "Oric"],
                ["Thomson MO5", "Thomson MO"],
                ["Watara Supervision", "Supervision"],
                ["Casio Loopy", "Casio Loopy"],
                ["Casio PV-1000", "Casio PV-1000"],
                ["Emerson Arcadia 2001", "Arcadia 2001"],
                ["Entex Adventure Vision", "Adventure Vision"],
                ["Epoch Super Casette Vision", "Epoch Super Cassette Vision"],
                ["Fairchild Channel F", "Channel F"],
                ["Funtech Super Acan", "Super A'can"],
                ["GamePark GP32", "GP32"],
                ["General Computer Vectrex", "Vectrex"],
                ["Magnavox-Phillips Odyssey", "Odyssey"], // mobygames also has Odyssey 2
                ["Memotech MTX", "Memotech MTX"],
                ["Miles Gordon Sam Coupe", "SAM Coupé"],
                ["Oculus Quest", "Quest"],
                ["Philips Videopac+", "Videopac+ G7400"],
                ["Philips CD-i", "CD-i"],
                ["RCA Studio II", "RCA Studio II"],
                ["SNK Neo Geo Pocket", "Neo Geo Pocket"],
            ])
            addCollectionIds(tags, mobygamesThemes, foundThemes)
            function addDevsPubs(list, addTo) {
                list.forEach(a => {
                    const platforms = JSON.parse(a.dataset?.popover)?.platforms
                    if (!platforms) {
                        addTo.add(a.textContent)
                        return
                    }
                    if (platforms.some(p => platformMap.get(platform) === p))
                        addTo.add(a.textContent)
                })
            }
            addDevsPubs(doc.querySelectorAll('#developerLinks a'), foundDevelopers)
            addDevsPubs(doc.querySelectorAll('#publisherLinks a'), foundPublishers)
            let groups = Array.from(doc.querySelectorAll('.badge.text-ellipsis a'))
            for (const a of groups) {
                if (['engine:', 'middleware:'].some(str => a.textContent.toLowerCase().includes(str))) {
                    foundEngines.add(a.textContent.replace(/^.*?: /, '')) // remove text before first colon and space
                    continue
                }
                if (a.textContent.includes('series')) {
                    foundSeries = a.textContent.replace('series', '').trim()
                }
            }
            addCollectionIds(groups.map(a => /\d+/.exec(a.href)[0]), mobygamesThemes_Groups, foundThemes, true)

            const specsLink = doc.querySelector('span.text-nowrap')?.firstElementChild
            if (!specsLink) return

            processURL("MobyGames", r => {
                const doc = parseDoc(r)
                const platformHeaderRow = getNodeByXPath(doc, `(.//table)[1]//h4[contains(text(), "${platformMap.get(platform)}")]/ancestor::tr`)
                let currentRow = platformHeaderRow?.nextElementSibling
                let specIds = []
                while (currentRow && !currentRow.querySelector('h4')) {
                    currentRow.querySelectorAll('td').forEach((td, i) => {
                        if (i === 0) {
                            foundFeatures.add(mobygamesFeatures_RowLabels.get(td.textContent.trim()))
                        } else {
                            td.querySelectorAll('a').forEach(a => {
                                specIds.push(/\d+/.exec(a.href)[0])
                            })
                        }
                    })
                    currentRow = currentRow.nextElementSibling
                }
                if (specIds.includes(156)) { // Same/Split-Screen
                    foundFeatures.add(963) // Local Multiplayer
                    foundFeatures.add(476) // Single Screen Multiplayer
                }
                addCollectionIds(specIds, mobygamesFeatures, foundFeatures, true)
            }, specsLink.href.replace('gazellegames.net', 'www.mobygames.com'))
        })
    }

    if (websites.get("PCGamingWiki")) {
        function addOthers(str, addTo) {
            str.split(',').forEach(t => {
                addTo.add(t.replace(/^.*?:/, ''))
            })
        }

        processURL("PCGamingWiki", (r, sitename) => {
            const result = r.response?.cargoquery // key will be 'error' if there's an error
            if (!result || result.length < 1) {
                setErrorStatus(sitename)
                return
            }
            const themeKeys = new Set(["Genres", "Pacing", "Perspectives", "Vehicles", "Art styles", "Themes"])

            for (const [key, value] of Object.entries(result[0].title)) {
                if (!value || value === "unknown") continue
                if (themeKeys.has(key)) {
                    value.split(',').forEach(t => {
                        foundThemes.add(pcgwThemes.get(t))
                    })
                    continue
                }
                switch (key) {
                    case "Series":
                        foundSeries = value
                        continue
                    case "Engines":
                        addOthers(value, foundEngines)
                        continue
                    case "Developers":
                        addOthers(value, foundDevelopers)
                        continue
                    case "Publishers":
                        addOthers(value, foundPublishers)
                        continue
                }
                if (value === "true") {
                    if (key === "Local") {
                        foundFeatures.add(963) // Single Screen Multiplayer
                        foundFeatures.add(476) // Local Multiplayer
                        continue
                    }
                    if (key === "VR only") {
                        foundThemes.add(683)
                        continue
                    }
                    const m = pcgwFeatures.get(key)
                    if (m) {
                        foundFeatures.add(m)
                        continue
                    }
                }
                pcgwFeatures_Substring.forEach(([k, v, id]) => {
                    if (key === k && value.includes(v)) foundFeatures.add(id)
                })
            }
        }, `https://www.pcgamingwiki.com/w/api.php?action=cargoquery&
    tables=Infobox_game,VR_support,Input,Multiplayer,Video&
    fields=Infobox_game._pageName=Page,
    Infobox_game.Genres,
    Infobox_game.Pacing,
    Infobox_game.Perspectives,
    Infobox_game.Vehicles,
    Infobox_game.Art_styles,
    Infobox_game.Themes,
    Infobox_game.Series,
    Infobox_game.Engines,
    Infobox_game.Developers,
    Infobox_game.Publishers,
    Input.Tracked_motion_controllers,
    Input.Controller_support,
    Input.Full_controller_support,
    Multiplayer.Local,
    Multiplayer.Local_players,
    Multiplayer.Local_modes,
    Multiplayer.LAN_modes,
    Multiplayer.Online_modes,
    VR_support.OculusVR,
    VR_support.Windows_Mixed_Reality,
    VR_support.Tobii_Eye_Tracking,
    VR_support.TrackIR,
    VR_support.Play_area_seated,
    VR_support.Play_area_standing,
    VR_support.Play_area_room_scale,
    Video.Upscaling,
    Video.Ray_tracing,
    &join_on=Infobox_game._pageName=VR_support._pageName,Infobox_game._pageName=Input._pageName,Infobox_game._pageName=Multiplayer._pageName,Infobox_game._pageName=Video._pageName&
    where=Infobox_game._pageName="${websites.get("PCGamingWiki").href.split('/')[4].replace(/_/g, ' ')}"&format=json`, {responseType: "json"})
    }

    if (websites.get("Wikipedia")) {
        function wikipediaAdd(node, addTo) {
            for (const child of node.childNodes) {
                if ((child.nodeType === Node.ELEMENT_NODE && child.tagName === 'A' && child.className === 'mw-redirect wl')
                    || (child.nodeType === Node.TEXT_NODE && /^[a-zA-Z]/.test(child.textContent) && !/[A-Z]{2,3}$/.test(child.textContent))) { // last condition is for regions
                    const text = child.textContent.replace(/[\[(].*?[\])]/g, '') // skip platforms inside brackets because there's no proper mapping and https://en.wikipedia.org/wiki/Template:Infobox_video_game says that they shouldn't be in there
                    addTo instanceof Set ? addTo.add(text) : addTo = text
                }
                wikipediaAdd(child, addTo)
            }
        }

        processURL("Wikipedia", (r, sitename) => {
            const doc = parseDoc(r)
            const infobox = doc.querySelector('table.infobox')
            if (!infobox) {
                setErrorStatus(sitename)
                return
            }
            infobox.querySelectorAll('tr:nth-child(2) ~ tr') // skip title and cover image
                .forEach(tr => {
                    const children = tr.children
                    switch (children[0].textContent) { // 0 = th, 1 = td
                        case 'Developer(s)':
                            wikipediaAdd(children[1], foundDevelopers)
                            break
                        case 'Publisher(s)':
                            wikipediaAdd(children[1], foundPublishers)
                            break
                        case 'Designer(s)':
                            wikipediaAdd(children[1], foundDesigners)
                            break
                        case 'Series':
                            wikipediaAdd(children[1], foundSeries)
                            break
                        case 'Composer(s)':
                            wikipediaAdd(children[1], foundComposers)
                            break
                        case 'Engine':
                            wikipediaAdd(children[1], foundEngines)
                            break
                    }
                })
        })
    }

    if (websites.get("VNDB")) {
        const vnId = /v(\d+)/.exec(websites.get("VNDB"))[0]
        const platformMap = new Map([
            ["Windows", "win"],
            ["Linux", "lin"],
            ["Mac", "mac"],
            ["3DO", "tdo"],
            ["iOS", "ios"],
            ["Android", "and"],
            ["DOS", "dos"],
            ["Dreamcast", "drc"],
            ["NES", "nes"],
            ["SNES", "sfc"],
            ["Game Boy Advance", "gba"],
            ["Game Boy Color", "gbc"],
            ["MSX", "msx"],
            ["Nintendo DS", "nds"],
            ["Switch", "swi"],
            ["Wii", "wii"],
            ["Wii U", "wiu"],
            ["Nintendo 3DS", "n3d"],
            ["NEC PC-98", "p98"],
            ["NEC TurboGrafx-16", "pce"],
            ["NEC PC-FX", "pcf"],
            ["PlayStation Portable", "psp"],
            ["PlayStation 1", "ps1"],
            ["PlayStation 2", "ps2"],
            ["PlayStation 3", "ps3"],
            ["PlayStation 4", "ps4"],
            ["PlayStation 5", "ps5"],
            ["PlayStation Vita", "psv"],
            ["Mega Drive", "smd"],
            ["Saturn", "sat"],
            ["Sharp X1", "x1s"],
            ["Sharp X68000", "x68"],
            ["Xbox", "xb1"],
            ["Xbox 360", "xb3"],
        ])

        // Native * Visual Novels
        const nativeLangMap = new Map([
            ["en", 1692],
            ["ru", 10496],
            ["zh-Hans", 10673],
            ["zh-Hant", 10673],
            ["ko", 10918],
        ])

        // Games With an Unofficial * Translation
        const unofficialTranslationMap = new Map([
            ["en", 5160],
            ["zh-Hans", 7870],
            ["zh-Hant", 7870],
            ["ko", 11477],
        ])

        function setOptions(dataObject) {
            return {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                responseType: "json",
                data: JSON.stringify(dataObject)
            }
        }

        processURL("VNDB", r => {
            let {developers, olang: originalLang, tags} = r.response.results[0]
            foundThemes.add(nativeLangMap.get(originalLang))
            const tagIds = tags.filter(i => i.rating >= 1 && i.spoiler < 2 && !i.lie).map(i => i.id)
            addCollectionIds(tagIds, vndbThemes, foundThemes, true, vndbThemesExtra)
            addAllStrings(developers.map(i => i.name), foundDevelopers)

            processURL("VNDB", r => {
                    let adult
                    for (const {engine, languages, official, producers, has_ero, uncensored} of r.response.results) {
                        foundEngines.add(engine)
                        if (uncensored) foundThemes.add(4138) // Uncensored Games
                        if (has_ero) adult = true
                        for (const {name, publisher} of producers) {
                            if (publisher && official)
                                foundPublishers.add(name)
                        }

                        const lang = languages[0].lang
                        if (languages[0].mtl) foundThemes.add(10320) // Machine Translation
                        if (lang === originalLang) continue
                        if (official) {
                            if (lang === "en") foundThemes.add(62) // English Translated Visual Novels
                        } else {
                            foundThemes.add(unofficialTranslationMap.get(lang))
                        }
                    }
                    if (adult) {
                        foundThemes.add(1793) // Eroge
                        foundThemes.delete(10638) // Child Protagonist
                    }
                }, 'https://api.vndb.org/kana/release', setOptions({
                    "filters": ["and", ["vn", "=", ["id", "=", `${vnId}`]], ["platform", "=", `${platformMap.get(platform)}`]],
                    "fields": "engine, languages.lang, languages.mtl, official, producers.publisher, producers.name, has_ero, uncensored",
                    "results": 100
                })
            )
        }, 'https://api.vndb.org/kana/vn', setOptions({
                "filters": ["id", "=", `${vnId}`],
                "fields": "tags.id, developers.name, olang, tags.rating, tags.spoiler, tags.lie"
            }
        ))

        processURL("VNDB", r => {
            addCollectionIds(r.response.results.flatMap(i => i.traits.map(trait => trait.id)), vndbThemes_Traits, foundThemes, true)
        }, 'https://api.vndb.org/kana/character', setOptions({
            "filters": ["vn", "=", ["id", "=", `${vnId}`]],
            "fields": "traits.id"
        }))
    }


    await Promise.allSettled(promises)
    await Promise.allSettled(promises) // for nested requests

    const groupIsAdult = document.querySelector("#tagslist a[href*='adult']")
    const existingCollectionIds = Array.from(
        document.querySelectorAll("#collages a[href*='collections.php?id='], #sidebar_group_info a[href*='collections.php?id=']"))
        .map(a => /\d+/.exec(a.href)[0])

    /**
     * @param {string} headerText
     * @param {Set<string>?} extra
     */
    function insertHeader(headerText, extra) {
        const header = document.createElement('h3')
        header.textContent = headerText + ' '
        if (extra) {
            Array.from(extra).forEach((name, index) => {
                header.insertAdjacentHTML('beforeend', `<span>${name}</span>${index !== extra.size - 1 ?
                    "<span class='comma'>, </span>": ''}`)
            })
        }
        content.append(header)
    }

    function insertLabel(id, name) {
        if (content.querySelector(`a[href='collections.php?id=${id}']`)) return
        const isExisting = existingCollectionIds.includes(id)
        content.insertAdjacentHTML('beforeend', `
<label>
<a href="collections.php?id=${id}" ${isExisting ? `style="color: #999C9F"` : ''} target="_blank">${name}</a>
${isExisting ? '' : `<input type="checkbox" checked>`}
</label>`)
    }

    function insertLabelsId(headerText, set, collectionMap, uncheckSet) {
        insertHeader(headerText)

        set.forEach(id => {
            const isExisting = existingCollectionIds.includes(id.toString())
            content.insertAdjacentHTML('beforeend', `
<label>
<a href="collections.php?id=${id}" ${isExisting ? `style="color: #999C9F"` : ''} target="_blank">${collectionMap.get(id)}</a>
${isExisting ? '' : `<input type="checkbox" ${uncheckSet.has(id) ? '' : 'checked'}>`}
</label>
`)
        })
    }

    function insertNotFound() {
        if (notFound.size < 1) return
        content.insertAdjacentHTML('beforeend', `
<p style="color: #b7adb5; grid-column: span ${GM_getValue('columns')}">
<span style="font-weight: bold; color: inherit">Not Found</span>: ${Array.from(notFound).join(', ')}
</p>`)
        notFound.clear()
    }


    foundThemes.delete(null)
    foundThemes.delete(undefined)
    foundFeatures.delete(null)
    foundFeatures.delete(undefined)
    foundEngines.delete(null)
    foundEngines.delete(undefined)
    foundDevelopers.delete(null)
    foundDevelopers.delete(undefined)
    foundPublishers.delete(null)
    foundPublishers.delete(undefined)

    const suffixes = ["Inc", "LLC", "Ltd", "Co", "Corp", "Pvt", "PLC", "AG", "GmbH", "SA", "AB", "NV", "KG",
        "OG", "EOOD", "SRL", "BV", "SL", "AS", "A/S", "Pty", "Ltda", "Sdn", "Bhd", "PT", "Pte", "Ltd", "LLP",
        "LP", "SARL", "e.V", "SE", "Oy", "RF", "Lda", "SpA", "Kft", "Zrt", "AS", "d.o.o", "s.r.o", "o.o.",
        "OOO", "A.D.", "JSC", "P.J.S.C", "S.A.B.", "C.V.", "S.A.P.I.", "de C.V.", "S. de R.L.", "de C.V.",
        "S.A.P.I.", "B.V.", "N.V.", "S.A.", "S.C.A.", "S.C.R.L.", "S.C.S.", "S.N.C.", "intl", "international", "S.R.l"]
    const suffixPattern = new RegExp(`,?\\s?(?:Co., Ltd|\\b(${suffixes.join("|")})\\b)\.?`, "i")

    foundDevelopers = new Set(Array.from(foundDevelopers, name => name.replace(suffixPattern, '').toLowerCase().trim()))
    foundPublishers = new Set(Array.from(foundPublishers, name => name.replace(suffixPattern, '').toLowerCase().trim()))
    if (!groupIsAdult) {
        foundThemes.forEach(id => {
            if (adultThemes.has(id)) foundThemes.delete(id)
        })
    }

    let notFound = new Set()

    if (foundFeatures.has(683)) { // Virtual Reality (VR) Only
        foundFeatures.delete(683)
        foundThemes.add(683)
    }

    if (foundFeatures.has(5940)) { // Controller Only
        foundFeatures.delete(5940)
        foundThemes.add(5940)
    }

    if (earlyAccess)
        foundThemes.add(152) // Early Access
    else if (existingCollectionIds.includes('152')) // group has Early Access but is not found to be in Early Access
        foundThemes.add(5148) // Out of Early Access


    if (foundThemes.size > 0) {
        if (foundThemes.has(1794)) // Nukige
            foundThemes.delete(1793) // Eroge
        if (foundThemes.has(3032) || foundThemes.has(3033)) // Yuri or Yaoi
            foundThemes.add(130) // LGBTQ Characters in Games
        if (foundThemes.has(10887) || foundThemes.has(11320)) { // Vertical or Horizontal Shoot 'em ups
            foundThemes.add(10887) // Vertical Shoot 'em ups
            foundThemes.add(11320) // Horizontal Shoot 'em ups
        }
        if (groupIsAdult)
            foundThemes.delete(1232) // Japanese Role-Playing Games
        const consoleExclusiveIds = [10145, 11386, 3232, 3267, 7194, 7090, 7590, 7628, 9626, 11781, 7590, 11615]
        const linkedGroups = Array.from(document.querySelectorAll('#grouplinks a div'))
        if (!linkedGroups.every(div => div.className === 'cats_ebooks' || div.className === 'cats_ost')) {
            consoleExclusiveIds.forEach(id => foundThemes.delete(id))
        }

        const uncheck = new Set([
            10887,
            11320,
            // Games With an Unofficial * Translation
            5160,
            7870,
            11477,
            10320, // Machine Translation
        ])
        if (foundThemes.size > 0)
            insertLabelsId('Themes', foundThemes, themesMap, uncheck)
    }

    if (foundFeatures.size > 0) {
        if (foundFeatures.has(472)) // 2-Player Split Screen Multiplayer
            foundFeatures.add(473) // 4-Player Split Screen Multiplayer
        if (foundFeatures.has(472))
            foundFeatures.add(476) // Single Screen Multiplayer
        if (foundFeatures.has(476)) {
            foundFeatures.add(472)
            foundFeatures.add(473)
        }
        if (foundFeatures.has(962)) { // Local Co-op support
            foundFeatures.add(961) // Co-Op Support
            foundFeatures.add(963) // Local Multiplayer
        }
        if (foundFeatures.has(961) && foundFeatures.has(963)) // Co-Op Support & Local Multiplayer
            foundFeatures.add(962)
        if (!['Windows', 'Linux', 'Mac'].includes(platform)) {
            foundFeatures.delete(551) // Native Controller Support
            foundFeatures.delete(3345) // Touch-Friendly Desktop Games
        }
        const uncheck = new Set([
            472,
            473,
        ])

        if (foundFeatures.size > 0)
            insertLabelsId('Features', foundFeatures, featuresMap, uncheck)
    }

    for (const [id, name] of franchises) {
        if (groupnameLower.includes(name.toLowerCase())) {
            insertHeader('Franchise')
            insertLabel(id, name)
            break
        }
    }

    if (foundEngines.size > 0) {
        insertHeader('Engine')
        for (const name of foundEngines) {
            let found
            for (const [collectionName, id] of enginesMap) {
                const nameL = name.toLowerCase()
                const collectionNameL = collectionName.toLowerCase()
                if (collectionNameL.includes(nameL) ||
                    collectionNameL.replace('engine', '').includes(nameL.replace('engine', '')) ||
                    collectionNameL.replace(/\d+/, '').trim().includes(nameL.replace(/\d+/, '').trim()) ||
                    collectionNameL.replace(' ', '').includes(nameL.replace(' ', '')) ||
                    collectionNameL.replace('-', '').includes(nameL.replace('-', ''))
                ) {
                    found = true
                    insertLabel(id, collectionName)
                    break
                }
            }
            !found && notFound.add(name)
        }
        insertNotFound()
    }

    async function findCollections(searchValue, func) {
        console.log('searching for', searchValue)
        await fetch(`ajax.php?action=collections_autocomplete&search=${encodeURIComponent(searchValue)}`,
        )
            .then(r => r.json())
            .then(r => {
                let [, names, , path] = r
                names = names.filter(n => n.toLowerCase().startsWith(searchValue))
                if (names.length < 1) {
                    notFound.add(searchValue)
                    return
                }
                func(names.map((n, i) => {
                    const [, name, category] = /(.*)\((.*?)\)$/.exec(n)
                    return {
                        category: category,
                        id: /\d+/.exec(path[i])[0],
                        name: name.trim()
                    }
                }))
            })
            .catch(r => {
                console.error(r)
                alert(`Error occured while searching for ${searchValue}`)
            })
    }

    const foundPublishersArray = [...foundPublishers]
    let publishers = []

    insertHeader('Developers', foundDevelopers)
    for (const devname of foundDevelopers) {
        let found

        await findCollections(devname, r => {
            r.forEach(({category, id, name}) => {
                if (category === 'Publisher') {
                    const index = foundPublishersArray.findIndex(p => p.startsWith(name.toLowerCase()))
                    if (index !== -1) {
                        foundPublishersArray.splice(index, 1)
                        publishers.push([id, name])
                    }
                } else if (category === 'Developer') {
                    found = true
                    insertLabel(id, name)
                }
            })
        })
        if (!found)
            notFound.add(devname)
    }
    insertNotFound()

    if (foundPublishers.size > 0 || publishers.length > 0) {
        insertHeader('Publishers', foundPublishers)
        for (const [id, name] of publishers) {
            insertLabel(id, name)
        }
        for (const name of foundPublishersArray) {
            await findCollections(name, r => {
                r.forEach(({category, id, name}) => {
                    if (category === 'Publisher')
                        insertLabel(id, name)
                    else notFound.add(name)
                })
            })
        }
        insertNotFound()
    }

    if (foundSeries) {
        insertHeader('Series')
        await findCollections(foundSeries, r => {
            const {category, id, name} = r[0]
            if (category === 'Series') {
                insertLabel(id, name)
            } else notFound.add(name)
        })
        insertNotFound()
    }

    if (foundDesigners.size > 0) {
        insertHeader('Designer')
        for (const name of foundDesigners) {
            await findCollections(name, r => {
                r.forEach(({category, id, name}) => {
                    if (category === 'Designer') {
                        insertLabel(id, name)
                    } else notFound.add(name)
                })
            })
        }
    }
    insertNotFound()

    document.getElementById('cc-loading').remove()

    section.insertAdjacentHTML('beforeend',
        `<div style="margin: 20px auto 0 auto;width: max-content;">
<button type="button" id="cc-uncheck" style="margin-right: 10px;">Uncheck All</button>
<button type="button" id="cc-submit">Submit</button>
</div>
`)

    document.getElementById('cc-uncheck').onclick = () => {
        content.querySelectorAll('label input').forEach(c => c.checked = false)
    }

    function submitCollection(body) {
        return fetch('collections.php', {
            method: 'post',
            headers: {'Content-Type': 'application/x-www-form-urlencoded'},
            body: body
        })
            .then(r => {
                if (!(r.ok && r.redirected)) {
                    console.warn(r)
                    throw Error
                }
            })
            .catch(() => {
                return Promise.reject(`Error adding collection id ${/collageid=(\d+)/.exec(body)[1]}`)
            })
    }

    const submitButton = document.getElementById('cc-submit')
    submitButton.onclick = () => {
        submitButton.textContent = 'Submitting'
        submitButton.style.backgroundColor = '#6e6937'
        submitButton.disabled = true

        const selectedIds = Array.from(content.querySelectorAll('label a'))
            .filter(a => a.nextElementSibling?.checked)
            .map(a => new URL(a.href).searchParams.get('id'))

        if (selectedIds.length < 1) {
            alert('None selected')
            return
        }

        const submits = []
        selectedIds.forEach(id => {
            if (id === '5148') {
                submits.push(submitCollection(`action=manage_handle&auth=${authkey}&collageid=152&remove[]=${new URL(location.href).searchParams.get('id')}&submit=Remove`)) // remove Early Access
            }
            submits.push(submitCollection(`action=add_torrent&auth=${authkey}&collageid=${id}&url=${location.href}`))
        })
        Promise.allSettled(submits).then(results => {
            submitButton.style.removeProperty('background-color')
            submitButton.textContent = 'Submitted'
            const rejected = results.filter(r => r.status === "rejected")
            if (rejected.length > 0) {
                rejected.forEach(i => console.warn(i.reason))
                alert('Some collections failed to be submitted. Check the console')
                return
            }
            if (GM_getValue('refresh_after_submit'))
                location.reload()
        })
    }
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
