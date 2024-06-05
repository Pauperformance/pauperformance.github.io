const currDeckId = '6431048'

function redirectToCurrentDeck() {
    const url = 'https://www.mtggoldfish.com/deck/' + currDeckId;
    document.write('<meta http-equiv="refresh" content="0; URL=' + url + '" />');
}

function redirectToCurrentPopout() {
    const url = 'https://www.mtggoldfish.com/deck/popout?id=' + currDeckId;
    document.write('<meta http-equiv="refresh" content="0; URL=' + url + '" />');
}
