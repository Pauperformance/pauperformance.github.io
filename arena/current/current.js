const currDeckId = '4946634'

function redirectToCurrentDeck() {
    const url = 'https://www.mtggoldfish.com/deck/' + currDeckId;
    document.write('<meta http-equiv="refresh" content="0; URL=' + url + '" />');
}

function redirectToCurrentPopout() {
    const url = 'https://www.mtggoldfish.com/deck/popout?id=' + currDeckId;
    document.write('<meta http-equiv="refresh" content="0; URL=' + url + '" />');
}
