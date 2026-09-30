(function () {

    "use strict";


    /* =========================================
       CONFIG
    ========================================= */

    const CONFIG = {

        DATA_URL: "../data/streams.json",

        TIMEOUT: 10000,

        PLAYER_OPTIONS: {

            width: "100%",

            height: "100%",

            controls: true,

            autostart: false,

            mute: false,

            stretching: "uniform",

            preload: "metadata",

            displaytitle: false,

            displaydescription: false

        }

    };


    /* =========================================
       DOM
    ========================================= */

    const loadingScreen =
        document.getElementById("loading-screen");

    const errorScreen =
        document.getElementById("error-screen");

    const playerWrapper =
        document.getElementById("player-wrapper");

    const errorMessage =
        document.getElementById("error-message");


    /* =========================================
       HELPERS
    ========================================= */

    function showError(message) {

        loadingScreen.classList.add("hidden");

        playerWrapper.classList.add("hidden");

        errorMessage.textContent =
            message || "This player URL is unavailable.";

        errorScreen.classList.remove("hidden");

        document.title = "404 - Stream Not Available";
    }


    function showPlayer() {

        loadingScreen.classList.add("hidden");

        errorScreen.classList.add("hidden");

        playerWrapper.classList.remove("hidden");
    }


    function getPlayerId() {

        const path =
            window.location.pathname;

        const cleanPath =
            path.replace(/\/+$/, "");

        const parts =
            cleanPath.split("/");

        const playerIndex =
            parts.lastIndexOf("player");

        if (
            playerIndex === -1 ||
            !parts[playerIndex + 1]
        ) {
            return null;
        }

        return decodeURIComponent(
            parts[playerIndex + 1]
        );
    }


    function parseDate(value) {

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return date;
    }


    function isCurrentlyAvailable(stream) {

        const now = Date.now();

        const start =
            parseDate(stream.start);

        const end =
            parseDate(stream.end);

        if (!start || !end) {
            return false;
        }

        return (
            now >= start.getTime() &&
            now < end.getTime()
        );
    }


    async function loadJSON() {

        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                () => controller.abort(),
                CONFIG.TIMEOUT
            );

        try {

            const response =
                await fetch(
                    CONFIG.DATA_URL,
                    {
                        cache: "no-store",
                        signal: controller.signal
                    }
                );

            if (!response.ok) {
                throw new Error(
                    "Unable to load stream data."
                );
            }

            return await response.json();

        } finally {

            clearTimeout(timeout);
        }
    }


    function findStream(data, id) {

        if (
            !data ||
            !Array.isArray(data.streams)
        ) {
            return null;
        }

        return data.streams.find(
            stream =>
                String(stream.id) === String(id)
        );
    }


    /* =========================================
       JW PLAYER
    ========================================= */

    function startJWPlayer(stream) {

        if (
            typeof jwplayer === "undefined"
        ) {

            showError(
                "Player library could not be loaded."
            );

            return;
        }


        const player =
            jwplayer("jw-player");


        const options = {

            ...CONFIG.PLAYER_OPTIONS,

            file: stream.url,

            title: stream.title || "Live Player"

        };


        player.setup(options);


        player.on(
            "ready",
            function () {

                showPlayer();

                document.title =
                    stream.title ||
                    "Live Player";
            }
        );


        player.on(
            "setupError",
            function () {

                showError(
                    "The player could not be started."
                );
            }
        );


        player.on(
            "error",
            function () {

                /*
                 * Do not automatically expose
                 * the original stream URL.
                 */

                console.warn(
                    "Player playback error."
                );
            }
        );

    }


    /* =========================================
       MAIN
    ========================================= */

    async function init() {

        const id =
            getPlayerId();


        if (!id) {

            showError(
                "Invalid player URL."
            );

            return;
        }


        try {

            const data =
                await loadJSON();


            const stream =
                findStream(data, id);


            if (!stream) {

                showError(
                    "This player ID does not exist."
                );

                return;
            }


            /*
             * Time restriction
             */

            if (
                !isCurrentlyAvailable(stream)
            ) {

                showError(
                    "This stream is outside its scheduled time."
                );

                return;
            }


            /*
             * Validate URL
             */

            if (
                typeof stream.url !== "string" ||
                !/^https?:\/\//i.test(stream.url)
            ) {

                showError(
                    "Invalid stream configuration."
                );

                return;
            }


            startJWPlayer(stream);


        } catch (error) {

            console.error(error);

            showError(
                "Unable to load this player."
            );
        }

    }


    init();


})();
