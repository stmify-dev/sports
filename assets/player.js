(function () {

    "use strict";


    /* =========================================
       CONFIG
    ========================================= */

    const CONFIG = {

        DATA_URL:
            "/sports/data/streams.json",

        TIMEOUT:
            10000,

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
        document.getElementById(
            "loading-screen"
        );

    const errorScreen =
        document.getElementById(
            "error-screen"
        );

    const playerWrapper =
        document.getElementById(
            "player-wrapper"
        );

    const errorMessage =
        document.getElementById(
            "error-message"
        );


    /* =========================================
       ERROR
    ========================================= */

    function showError(message) {

        loadingScreen.classList.add(
            "hidden"
        );

        playerWrapper.classList.add(
            "hidden"
        );

        errorMessage.textContent =
            message ||
            "This player URL is unavailable.";

        errorScreen.classList.remove(
            "hidden"
        );

        document.title =
            "404 - Stream Not Available";

    }


    /* =========================================
       PLAYER DISPLAY
    ========================================= */

    function showPlayer() {

        loadingScreen.classList.add(
            "hidden"
        );

        errorScreen.classList.add(
            "hidden"
        );

        playerWrapper.classList.remove(
            "hidden"
        );

    }


    /* =========================================
       GET ID FROM:

       /sports/live/abc123/
    ========================================= */

    function getPlayerId() {
    
        const params =
            new URLSearchParams(
                window.location.search
            );
    
    
        const queryId =
            params.get("id");
    
    
        if (queryId) {
    
            return queryId;
    
        }
    
    
        const path =
            window.location.pathname;
    
    
        const match =
            path.match(
                /\/sports\/live\/([^\/]+)\/?$/
            );
    
    
        if (!match) {
    
            return null;
    
        }
    
    
        return decodeURIComponent(
            match[1]
        );
    
    }


    /* =========================================
       DATE PARSER
    ========================================= */

    function parseDate(value) {

        if (
            typeof value !== "string" ||
            !value
        ) {

            return null;

        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return null;

        }

        return date;

    }


    /* =========================================
       TIME CHECK
    ========================================= */

    function isCurrentlyAvailable(
        stream
    ) {

        const now =
            Date.now();

        const start =
            parseDate(
                stream.start
            );

        const end =
            parseDate(
                stream.end
            );


        if (!start || !end) {

            return false;

        }


        if (
            end.getTime() <=
            start.getTime()
        ) {

            return false;

        }


        return (
            now >= start.getTime() &&
            now < end.getTime()
        );

    }


    /* =========================================
       LOAD JSON
    ========================================= */

    async function loadJSON() {

        const controller =
            new AbortController();

        const timeout =
            setTimeout(
                function () {

                    controller.abort();

                },
                CONFIG.TIMEOUT
            );


        try {

            const response =
                await fetch(
                    CONFIG.DATA_URL +
                    "?t=" +
                    Date.now(),
                    {
                        cache: "no-store",
                        signal:
                            controller.signal
                    }
                );


            if (!response.ok) {

                throw new Error(
                    "Unable to load stream data."
                );

            }


            return await response.json();

        }

        finally {

            clearTimeout(
                timeout
            );

        }

    }


    /* =========================================
       FIND STREAM
    ========================================= */

    function findStream(
        data,
        id
    ) {

        if (
            !data ||
            !Array.isArray(
                data.streams
            )
        ) {

            return null;

        }


        return data.streams.find(
            function (stream) {

                return String(
                    stream.id
                ) === String(id);

            }
        ) || null;

    }


    /* =========================================
       START JW PLAYER
    ========================================= */

    function startJWPlayer(
        stream
    ) {

        if (
            typeof jwplayer ===
            "undefined"
        ) {

            showError(
                "JW Player could not be loaded."
            );

            return;

        }


        const player =
            jwplayer(
                "jw-player"
            );


        const options = {

            ...CONFIG.PLAYER_OPTIONS,

            file:
                stream.url,

            title:
                stream.title ||
                "Live Player"

        };


        player.setup(
            options
        );


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

                console.warn(
                    "Playback error."
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
                "Invalid live player URL."
            );

            return;

        }


        try {

            const data =
                await loadJSON();


            const stream =
                findStream(
                    data,
                    id
                );


            if (!stream) {

                showError(
                    "This player ID does not exist."
                );

                return;

            }


            /* ================================
               TIME CONTROL
            ================================= */

            if (
                !isCurrentlyAvailable(
                    stream
                )
            ) {

                showError(
                    "This stream is outside its scheduled time."
                );

                return;

            }


            /* ================================
               URL VALIDATION
            ================================= */

            if (
                typeof stream.url !==
                    "string" ||
                !/^https?:\/\//i.test(
                    stream.url
                )
            ) {

                showError(
                    "Invalid stream URL."
                );

                return;

            }


            startJWPlayer(
                stream
            );


        }

        catch (error) {

            console.error(
                error
            );

            showError(
                "Unable to load this player."
            );

        }

    }


    init();


})();
