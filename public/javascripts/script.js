const socket = io();
let form = document.querySelector(".form");
let msgbox = document.querySelector("#msgbox");
let msg_area = document.querySelector(".msg-area");
let room;

// Joining room on page load
socket.emit("joinroom");
socket.on("joined", (roomname) => {
  room = roomname;
  document.querySelector(".nobody").classList.add("hidden");
});

// Sending message
form.addEventListener("submit", (elem) => {
  elem.preventDefault();
  socket.emit("msg", { room, msg: msgbox.value });
  sender(msgbox.value);
  msgbox.value = "";
  msgbox.focus();
});

// Display received message
function received(xxx) {
  const parentDiv = document.createElement("div");
  parentDiv.classList.add("flex", "items-center", "space-x-3");
  const img = document.createElement("img");
  img.src = "https://i.pinimg.com/236x/2e/60/0c/2e600ced4390a438d6ce07d68826ee2b.jpg";
  img.alt = "User avatar";
  img.classList.add("rounded-full", "w-10", "h-10");
  const innerDiv = document.createElement("div");
  innerDiv.classList.add("bg-gray-600", "p-3", "rounded-lg");
  const paragraph = document.createElement("p");
  paragraph.textContent = xxx;
  innerDiv.appendChild(paragraph);
  parentDiv.appendChild(img);
  parentDiv.appendChild(innerDiv);
  msg_area.appendChild(parentDiv);
  msg_area.scrollTop = msg_area.scrollHeight;
}

// Display sent message
function sender(xxx) {
  const parentDiv = document.createElement("div");
  parentDiv.classList.add("flex", "items-center", "justify-end", "space-x-3");
  const innerDiv = document.createElement("div");
  innerDiv.classList.add("bg-blue-600", "p-3", "rounded-lg");
  const paragraph = document.createElement("p");
  paragraph.textContent = xxx;
  innerDiv.appendChild(paragraph);
  const img = document.createElement("img");
  img.src = "https://i.pinimg.com/564x/64/79/ac/6479acfe0cb87ed80139da9d5d9c85f5.jpg";
  img.alt = "User avatar";
  img.classList.add("rounded-full", "w-10", "h-10");
  parentDiv.appendChild(innerDiv);
  parentDiv.appendChild(img);
  msg_area.appendChild(parentDiv);
  msg_area.scrollTop = msg_area.scrollHeight;
}

// Receiving a message
socket.on("message", (msg) => {
  received(msg);
});

// Video Call Logic
let localStream;
let peerConnection;
let remoteStream;
let inCall = false;

const rtcSettings = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const initialize = async () => {
  socket.on("signalingMessage", handleSignalingMessage);

  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.querySelector("#localVideo").srcObject = localStream;
    document.querySelector("#localVideo").style.display = "block";
    initiateOffer();
    inCall = true;
  } catch (err) {
    console.log(err.message);
  }
};
initialize();

const initiateOffer = async () => {
  await createPeerConnection();
  try {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit("signalingMessage", {
      room,
      message: JSON.stringify({
        type: "offer",
        offer,
      }),
    });
  } catch (error) {
    console.log("Error in creating offer " + error);
  }
};

const createPeerConnection = () => {
  peerConnection = new RTCPeerConnection(rtcSettings);

  remoteStream = new MediaStream();
  document.querySelector("#remoteVideo").srcObject = remoteStream;
  document.querySelector("#remoteVideo").style.display = "block";

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };
};

const handleSignalingMessage = async (message) => {
  const { type, offer, answer, candidate } = JSON.parse(message);
  if (type === "offer") handleOffer(offer);
  if (type === "answer") handleAnswer(answer);
  if (type === "candidate" && peerConnection) {
    try {
      await peerConnection.addIceCandidate(candidate);
    } catch (err) {
      console.log(err);
    }
  }
};

const handleOffer = async (offer) => {
  await createPeerConnection();
  try {
    peerConnection.setRemoteDescription(offer);
    showCallModal(); // Show modal for accept/deny
  } catch (error) {
    console.log("Failed to handle offer :(");
  }
};

const handleAnswer = async (answer) => {
  try {
    await peerConnection.setRemoteDescription(answer);
  } catch (error) {
    console.log("Failed to handle the answer :(");
  }
};

// Show incoming call modal
const showCallModal = () => {
  document.getElementById("incomingCallModal").classList.remove("hidden");
};

// Hide call modal
const hideCallModal = () => {
  document.getElementById("incomingCallModal").classList.add("hidden");
};

// Accept call
document.getElementById("acceptCall").addEventListener("click", () => {
  socket.emit("acceptCall", { room });
  hideCallModal();
  inCall = true;
});

// Deny call
document.getElementById("denyCall").addEventListener("click", () => {
  socket.emit("denyCall", { room });
  hideCallModal();
  inCall = false;
});

document.querySelector(".requestCallBtn").addEventListener("click", () => {
  socket.emit("startVideoCall", { room });
});
socket.on("incomingCall", () => {
  showCallModal();
});
socket.on("callAccepted", () => {
  console.log("Call was accepted, proceeding with connection...");
});
socket.on("callDenied", () => {
  alert("Call was denied.");
  inCall = false;
});
