const ws = new WebSocket(`wss://${location.host}`);

const connectBtn = document.getElementById('connect-btn');

const sendBtn = document.getElementById('send-btn');
const messageInput = document.getElementById('message-input');
const messages = document.getElementById('messages');

const connectContainer = document.getElementById('connect-container');
const messageContainer = document.getElementById('message-container');
const messagesContainer = document.getElementById('messages-container');

const messageForm = document.getElementById('message-form');

let peerConnection = null;

let dataChannel = null;
let messageCounter = null;

const config = {iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]};

function openFeed(){
    connectContainer.style.display = 'none';
    messageContainer.style.display = 'flex';
}

function createPeerConnection(){
    const pc = new RTCPeerConnection(config);

    pc.addEventListener('icecandidate', ({candidate}) => {
        if(candidate){
            ws.send(JSON.stringify({type: 'candidate', candidate}));
        }
    });

    pc.addEventListener('connectionstatechange', () =>{
        switch(peerConnection.connectionState){
            case 'connected':
                openFeed();
                console.log("connected");
                break;
        }
    });

    pc.addEventListener('datachannel', (event) => {
        dataChannel = event.channel;
        dataChannel.addEventListener('open', () =>{
            console.log("data channel created successfully");
        });
        dataChannel.addEventListener('message', (event) => {
            console.log(`received message: ${event.data}`);
            const p = document.createElement('p');
            p.classList.add('receiver');
            p.textContent = event.data;
            messagesContainer.appendChild(p);

            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        });
    });

    return pc;
}

async function connectToPeer(){
    messageCounter = 0;
    peerConnection = createPeerConnection();


    dataChannel = peerConnection.createDataChannel("text");
    dataChannel.addEventListener('open', () => {
        console.log("data channel opened successfully");
    });
    dataChannel.addEventListener('message', (event) => {
        console.log(`message received: ${event.data}`);
        const p = document.createElement('p');
        p.classList.add('receiver');
        p.textContent = event.data;
        messagesContainer.appendChild(p);

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });


    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    ws.send(JSON.stringify({type: 'offer', offer}));
}

ws.addEventListener('message', async (message) => {
    const data = JSON.parse(message.data instanceof Blob ? await message.data.text() : message.data);

    if(!peerConnection){
        peerConnection = createPeerConnection();
    }

    switch(data.type){
        case 'candidate':
            console.log("candidate received");
            if(data.candidate){
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            }
            break;

        case 'offer':
            console.log('offer received');
            messageCounter = 100;
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            ws.send(JSON.stringify({type: 'answer', answer}));
            break;

        case 'answer':
            console.log('answer received');
            await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
            break;

        default:
            console.log("type not understood");
            break;
    }
});

connectBtn.addEventListener('click', () => {
    console.log("clicked");
    connectToPeer();
});

sendBtn.addEventListener('click', () => {
    console.log(`message to send: ${messageInput.value}`);
    const p = document.createElement('p');
    p.classList.add('sender');
    if(messageInput.value){
        dataChannel.send(messageInput.value);
        p.textContent = messageInput.value;
    } else {
        dataChannel.send(messageCounter);
        p.textContent = `${messageCounter}`
        messageCounter++;
    }

    messagesContainer.appendChild(p);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

    messageInput.value = "";
})

messageForm.addEventListener('submit', (event) => {
    event.preventDefault();
})
