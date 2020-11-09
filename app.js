(function () {
  let dataConnection = null;
  let mediaConnection = null;

  const peersEl = document.querySelector(".peers");
  const sendButtonEl = document.querySelector(".send-new-message-button");
  const newMessageEl = document.querySelector(".new-message");
  const messagesEl = document.querySelector(".messages");
  const listPeerButtonsEl = document.querySelector(".list-all-peers-button");
  const theirVideoContainer = document.querySelector(".video-container.them");
  const videoOfThemEl = document.querySelector(".video-container.them video");
  const videoOfMeEl = document.querySelector(".video-container.me video");

  navigator.mediaDevices
    .getUserMedia({ audio: false, video: true })
    .then((stream) => {
      videoOfMeEl.muted = true;
      videoOfMeEl.srcObject = stream;
    });

  const printMessage = (text, who) => {
    const messageEl = document.createElement("div");
    messageEl.classList.add("message", who);
    messageEl.innerHTML = `<div>${text}</div>`;
    messagesEl.append(messageEl);
    messageEl.scrollTop = messageEl.scrollHeight;
  };
  // get peer id (hash) from URL (mata in din Id efter we adressen med ¤+id ex "#raf")
  const myPeerId = location.hash.slice(1);

  // connect to peer server
  let peer = new Peer(myPeerId, {
    host: "glajan.com",
    port: 8443,
    path: "/myapp",
    secure: true,
    config: {
      iceServers: [
        { urls: ["stun:eu-turn7.xirsys.com"] },
        {
          username:
            "1FOoA8xKVaXLjpEXov-qcWt37kFZol89r0FA_7Uu_bX89psvi8IjK3tmEPAHf8EeAAAAAF9NXWZnbGFqYW4=",
          credential: "83d7389e-ebc8-11ea-a8ee-0242ac140004",
          urls: [
            "turn:eu-turn7.xirsys.com:80?transport=udp",
            "turn:eu-turn7.xirsys.com:3478?transport=udp",
            "turn:eu-turn7.xirsys.com:80?transport=tcp",
            "turn:eu-turn7.xirsys.com:3478?transport=tcp",
            "turns:eu-turn7.xirsys.com:443?transport=tcp",
            "turns:eu-turn7.xirsys.com:5349?transport=tcp",
          ],
        },
      ],
    },
  });
  // Print peer Id on connetion "open" event.
  peer.on("open", (id) => {
    const myPeerIdEl = document.querySelector(".my-peer-id");
    myPeerIdEl.innerText = id;
  });
  peer.on("error", (errorMessage) => {
    console.error(errorMessage);
  });
  // on incoming connections
  peer.on("connection", (connection) => {
    // close existing connection and sett new connection
    dataConnection && dataConnection.close();

    // set new connection
    dataConnection = connection;

    const event = new CustomEvent("peer-changed", { detail: connection.peer });
    document.dispatchEvent(event);
  });

  // event listener for incoming video call
  peer.on("call", (incomingCall) => {
    mediaConnection && mediaConnection.close();

    // change stste of start/stop button
    startVideoButton.classList.remove("active");
    stopVideoButton.classList.add("active");

    //Answer incoming call
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: true })
      .then((myStream) => {
        incomingCall.answer(myStream);
        mediaConnection = incomingCall;
        mediaConnection.on("stream", (theirStream) => {
          videoOfThemEl.muted = true;
          videoOfThemEl.srcObject = theirStream;
        });
      });
  });

  // event lsitener for click "refresh list "
  listPeerButtonsEl.addEventListener("click", () => {
    // go in på Peerjs.com / lägg till
    peer.listAllPeers((peers) => {
      const listItems = peers.filter((peerId) => {
        if (peerId === peer._id) return false;
        return true;
      });
      const listItemsString = listItems
        .map((peer) => {
          return `<li>
        <button class ="connect-button peerId-${peer}">${peer}</button>
        </li>`;
        })
        .join("");
      const newPeerListItem = document.createElement("ul");
      newPeerListItem.innerHTML = listItemsString;
      peersEl.appendChild(newPeerListItem);
    });
  });
  // event lsitener for click on button
  peersEl.addEventListener("click", (event) => {
    if (!event.target.classList.contains("connect-button")) return;
    // get peer id from button element
    const theirPeerId = event.target.innerText;

    // close exesting connection
    if (dataConnection) {
      dataConnection.close();
    }

    // connect to peer
    //"www.peerjs/docs/html!#api"
    dataConnection = peer.connect(theirPeerId);

    dataConnection.on("open", () => {
      // dispatch Custom Event with connected peer id.
      const event = new CustomEvent("peer-changed", {
        detail: theirPeerId,
      });
      document.dispatchEvent(event);
    });
  });

  // listen for custom event "peer changed"
  document.addEventListener("peer-changed", (e) => {
    const peerId = e.detail;

    const connectButtonEl = document.querySelector(
      `.connect-button.peerId-${peerId}`
    );
    document.querySelectorAll(".connect-button.connected").forEach((button) => {
      button.classList.remove("connected");
    });

    // add class "connected" to click button
    connectButtonEl && connectButtonEl.classList.add("connected");

    // Listen for incoming data /textmessage
    dataConnection.on("data", (textMessage) => {
      printMessage(textMessage, "them");
    });

    // set focus on text inputfield
    newMessageEl.focus();

    theirVideoContainer.querySelector(".name").innerText = peerId;
    theirVideoContainer.classList.add("connected");
    theirVideoContainer.querySelector(".start").classList.add("active");
    theirVideoContainer.querySelector(".stop").classList.remove("active");
  });
  // send message to peer
  const sendMessage = (e) => {
    if (!dataConnection) return;
    if (newMessageEl.value === "") return;

    if (e.type === "click" || e.keyCode === 13) {
      dataConnection.send(newMessageEl.value);
      printMessage(newMessageEl.value, "me");

      // clear text input field
      newMessageEl.value = "";
    }
    newMessageEl.focus();
  };
  // event listener for "send"
  newMessageEl.addEventListener("keyup", sendMessage);
  sendButtonEl.addEventListener("click", sendMessage);

  // event listener for click "start video chat"
  const startVideoButton = theirVideoContainer.querySelector(".start");
  const stopVideoButton = theirVideoContainer.querySelector(".stop");
  startVideoButton.addEventListener("click", () => {
    startVideoButton.classList.remove("active");
    stopVideoButton.classList.add("active");

    // start video call with remote peer
    navigator.mediaDevices
      .getUserMedia({ audio: false, video: true })
      .then((myStream) => {
        mediaConnection && mediaConnection.close();
        const theirPeerId = dataConnection.peer;
        mediaConnection = peer.call(theirPeerId, myStream);
        mediaConnection.on("stream", (theirStream) => {
          videoOfThemEl.muted = true;
          videoOfThemEl.srcObject = theirStream;
        });
      });
  });

  // event listener for click "hang up"
  stopVideoButton.addEventListener("click", () => {
    stopVideoButton.classList.remove("active");
    startVideoButton.classList.add("active");
    mediaConnection && mediaConnection.close();
  });
})();
