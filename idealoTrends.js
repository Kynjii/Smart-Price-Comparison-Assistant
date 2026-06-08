window.spca = window.spca || {};

const TRENDING_CDN_URL = "https://cdn.idealo.com/storage/assets/trending-searches/trending_searches_de_DE.json";

let leaderboardModal = null;
let sortBy = "popularity";

function showTrendLeaderboard() {
    if (leaderboardModal) {
        leaderboardModal.remove();
        leaderboardModal = null;
        return;
    }

    const cached = window.spca.trendingSearchesCache;
    if (cached && cached.length) {
        openWithData([...cached]);
        return;
    }

    fetch(TRENDING_CDN_URL)
        .then(function (res) {
            return res.json();
        })
        .then(function (data) {
            var raw = Array.isArray(data) ? data : data.queries || [];
            var items = raw.map(function (item) {
                if (typeof item === "string") return { query: item, popularity: 0, percentIncrease: 0 };
                return item;
            });
            window.spca.trendingSearchesCache = items;
            openWithData([...items]);
        })
        .catch(function () {});
}

function openWithData(items) {
    if (!items.length) return;

    sortItems(items);

    leaderboardModal = buildDOM(items);
    document.body.appendChild(leaderboardModal);
    render(items);
}

function sortItems(items) {
    items.sort(function (a, b) {
        return (b[sortBy] || 0) - (a[sortBy] || 0);
    });
}

function buildDOM(items) {
    var overlay = document.createElement("div");
    overlay.className = "spca-lb-overlay";
    overlay.setAttribute("data-extension-ui", "true");
    overlay.addEventListener("click", function (e) {
        if (e.target === overlay) {
            overlay.remove();
            leaderboardModal = null;
        }
    });

    var board = document.createElement("div");
    board.className = "spca-lb-board";

    var header = document.createElement("div");
    header.className = "spca-lb-header";

    var titleRow = document.createElement("div");
    titleRow.className = "spca-lb-title-row";
    var title = document.createElement("span");
    title.className = "spca-lb-title";
    title.textContent = "\u{1F3C6} Such-Trends Rangliste";
    titleRow.appendChild(title);

    var closeBtn = document.createElement("button");
    closeBtn.className = "spca-lb-close";
    closeBtn.title = "Schlie\u00DFen";
    closeBtn.textContent = "\u2715";
    closeBtn.addEventListener("click", function () {
        overlay.remove();
        leaderboardModal = null;
    });

    header.appendChild(titleRow);
    header.appendChild(closeBtn);

    var sortBar = document.createElement("div");
    sortBar.className = "spca-lb-periods";
    var sortLabel = document.createElement("span");
    sortLabel.className = "spca-lb-periods-label";
    sortLabel.textContent = "Sortierung";
    sortBar.appendChild(sortLabel);

    var popBtn = document.createElement("button");
    popBtn.className = "spca-lb-period-pill";
    popBtn.textContent = "\u2605 Beliebt";
    if (sortBy === "popularity") popBtn.classList.add("active");
    popBtn.addEventListener("click", function () {
        sortBy = "popularity";
        sortItems(items);
        render(items);
        updateSortPills(sortBar, "popularity");
    });
    sortBar.appendChild(popBtn);

    var trendBtn = document.createElement("button");
    trendBtn.className = "spca-lb-period-pill";
    trendBtn.textContent = "\u2191 Trend";
    if (sortBy === "percentIncrease") trendBtn.classList.add("active");
    trendBtn.addEventListener("click", function () {
        sortBy = "percentIncrease";
        sortItems(items);
        render(items);
        updateSortPills(sortBar, "percentIncrease");
    });
    sortBar.appendChild(trendBtn);

    var summary = document.createElement("div");
    summary.className = "spca-lb-summary";
    summary.id = "spcaLbSummary";

    var podium = document.createElement("div");
    podium.className = "spca-lb-podium";
    podium.id = "spcaLbPodium";

    var divider = document.createElement("div");
    divider.className = "spca-lb-divider";
    divider.textContent = "Weitere Suchbegriffe";

    var listScroll = document.createElement("div");
    listScroll.className = "spca-lb-list";
    listScroll.id = "spcaLbList";

    board.appendChild(header);
    board.appendChild(sortBar);
    board.appendChild(summary);
    board.appendChild(podium);
    board.appendChild(divider);
    board.appendChild(listScroll);
    overlay.appendChild(board);

    applyLeaderboardTheme(board);

    return overlay;
}

function updateSortPills(sortBar, active) {
    var pills = sortBar.querySelectorAll(".spca-lb-period-pill");
    pills.forEach(function (p) {
        return p.classList.remove("active");
    });
    if (active === "popularity") pills[0].classList.add("active");
    else pills[1].classList.add("active");
}

function applyLeaderboardTheme(board) {
    if (!board) return;

    var sysTheme = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    board.classList.add("spca-lb-theme-" + sysTheme);

    if (typeof isExtensionContextValid === "function" && isExtensionContextValid()) {
        try {
            chrome.storage.local.get(["selectedTheme"], function (result) {
                if (chrome.runtime.lastError || !board) return;
                var stored = result.selectedTheme;
                if (stored && stored !== sysTheme) {
                    board.classList.remove("spca-lb-theme-" + sysTheme);
                    board.classList.add("spca-lb-theme-" + stored);
                }
            });
        } catch (e) {
            /* extension context may be invalid */
        }
    }
}

function render(items) {
    var board = leaderboardModal.querySelector(".spca-lb-board");
    if (!board) return;

    renderSummary(board, items);
    renderPodium(board, items);
    renderList(board, items);
}

function renderSummary(board, items) {
    var summary = board.querySelector("#spcaLbSummary");
    if (!summary) return;

    var total = items.length;
    var topPopularity = items[0] ? items[0].popularity || 0 : 0;
    var avgIncrease =
        items.reduce(function (s, it) {
            return s + (it.percentIncrease || 0);
        }, 0) / total;

    summary.innerHTML = "";
    summary.appendChild(summaryItem("Begriffe:", total.toString(), ""));
    summary.appendChild(summaryItem("Top \u2605:", topPopularity.toString(), "green"));
    summary.appendChild(summaryItem("\u00D8 \u2191:", avgIncrease.toFixed(1) + "%", "orange"));
}

function renderPodium(board, items) {
    var podium = board.querySelector("#spcaLbPodium");
    if (!podium) return;

    var top3 = items.slice(0, 3);
    var podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3.length === 2 ? [top3[1], top3[0]] : top3;
    var medals = ["\u{1F948}", "\u{1F947}", "\u{1F949}"];
    var spotClasses = ["second", "first", "third"];

    podium.innerHTML = "";
    podiumOrder.forEach(function (item, i) {
        if (!item) return;
        var spotIdx = podiumOrder.length >= 3 ? i : i + (3 - podiumOrder.length);
        var spot = document.createElement("div");
        spot.className = "spca-lb-podium-spot " + (spotClasses[spotIdx] || "");

        var trendClass = trendCls(item.percentIncrease);
        var trendStr = item.percentIncrease != null ? formatTrend(item.percentIncrease) : "";
        var searchURL = "https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=" + encodeURIComponent(item.query);

        spot.innerHTML = '<div class="spca-lb-medal">' + (medals[spotIdx] || "\u{1F3C5}") + "</div>" + '<div class="spca-lb-podium-shop" title="' + esc(item.query) + '">' + esc(item.query) + "</div>" + '<div class="spca-lb-podium-price">\u2605 ' + (item.popularity || 0) + "</div>" + (trendStr ? '<div class="spca-lb-podium-trend ' + trendClass + '">' + trendStr + "</div>" : "") + '<div class="spca-lb-podium-bar"></div>';
        spot.addEventListener("click", function () {
            window.open(searchURL, "_blank");
        });
        podium.appendChild(spot);
    });
}

function renderList(board, items) {
    var listScroll = board.querySelector("#spcaLbList");
    if (!listScroll) return;

    listScroll.querySelectorAll(".spca-lb-row").forEach(function (el) {
        return el.remove();
    });

    var rest = items.slice(3);
    rest.forEach(function (item, idx) {
        var rank = idx + 4;
        var searchURL = "https://www.idealo.de/preisvergleich/MainSearchProductCategory.html?q=" + encodeURIComponent(item.query);
        var pop = item.popularity || 0;
        var tc = trendCls(item.percentIncrease);
        var ts = formatTrend(item.percentIncrease);

        var row = document.createElement("div");
        row.className = "spca-lb-row";
        row.title = esc(item.query) + " — \u2605 " + pop + " · \u2191 " + (item.percentIncrease || 0).toFixed(1) + "%";

        row.innerHTML =
            '<div class="spca-lb-rank" title="Platz ' +
            rank +
            '">#' +
            rank +
            "</div>" +
            '<div class="spca-lb-row-info">' +
            '<div class="spca-lb-row-shop">' +
            esc(item.query) +
            "</div>" +
            "</div>" +
            '<div class="spca-lb-row-price">\u2605 ' +
            pop +
            "</div>" +
            '<div class="spca-lb-trend-pill ' +
            tc +
            '" title="Trend-Anstieg: \u2191 ' +
            (item.percentIncrease || 0).toFixed(1) +
            '%">' +
            ts +
            "</div>" +
            '<a href="' +
            searchURL +
            '" target="_blank" rel="noopener" class="spca-lb-search-link" title="\u{1F50D} Auf Idealo suchen: ' +
            esc(item.query) +
            '" onclick="event.stopPropagation()">\u{1F50D}</a>';

        listScroll.appendChild(row);
    });
}

function summaryItem(label, value, cls) {
    var span = document.createElement("span");
    span.innerHTML = label + ' <b class="' + cls + '">' + value + "</b>";
    return span;
}

function trendCls(pct) {
    if (pct == null) return "flat";
    if (pct < 0) return "down";
    if (pct > 20) return "down-great";
    if (pct > 0) return "up";
    return "flat";
}

function trendArrow(pct) {
    if (pct == null) return "\u2192";
    return pct > 0 ? "\u2191" : pct < 0 ? "\u2193" : "\u2192";
}

function formatTrend(pct) {
    if (pct == null) return "\u2013";
    return trendArrow(pct) + " " + Math.abs(pct).toFixed(1) + "%";
}

function esc(str) {
    if (!str) return "";
    var div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

window.spca.showTrendLeaderboard = showTrendLeaderboard;
