/**
 * scroll to the bottom of the chats after new message has been added to chat
 */
const converter = new showdown.Converter();
function scrollToBottomOfResults() {
  const terminalResultsDiv = document.getElementById("chats");
  terminalResultsDiv.scrollTop = terminalResultsDiv.scrollHeight;
}

var mediaRecorder;
var audioChunks = [];

/**
 * Set user response on the chat screen
 * @param {String} message user message
 */
function setUserResponse(message) {
  const user_response = `<img class="userAvatar" src='./statics/img/userAvatar.jpg'><div class="userMsg">${message} </div><div class="clearfix"></div>`;
  $(user_response).appendTo(".chats").show("slow");

  $(".usrInput").val("");
  scrollToBottomOfResults();
  showBotTyping();
  $(".suggestions").remove();
}

/**
 * returns formatted bot response
 * @param {String} text bot message response's text
 *
 */
function getBotResponse(text) {
  botResponse = `<img class="botAvatar" src="./statics/img/sara_avatar.png"/><span class="botMsg">${text}</span><div class="clearfix"></div>`;
  return botResponse;
}

/**
 * renders bot response on to the chat screen
 * @param {Array} response json array containing different types of bot response
 *
 * for more info: `https://rasa.com/docs/rasa/connectors/your-own-website#request-and-response-format`
 */
function setBotResponse(response) {
  // renders bot response after 500 milliseconds
  setTimeout(() => {
    hideBotTyping();
    if (response.length < 1) {
      // if there is no response from Rasa, send  fallback message to the user
      const fallbackMsg = "مشکلی پیش امده !!! لطفا دوباره تلاش کنید";

      const BotResponse = `<img class="botAvatar" src="./statics/img/botAvatar_old.png"/><p class="botMsg">${fallbackMsg}</p><div class="clearfix"></div>`;

      $(BotResponse).appendTo(".chats").hide().fadeIn(1000);
      scrollToBottomOfResults();
    } else {
      // if we get response from Rasa
      let botResponse;
      html = converter.makeHtml(response);
        // check if the response contains "text"
      html = html
        .replaceAll("<p>", "")
        .replaceAll("</p>", "")
        .replaceAll("<strong>", "<b>")
        .replaceAll("</strong>", "</b>");
      html = html.replace(/(?:\r\n|\r|\n)/g, "<br>");
      console.log(html);
      // check for blockquotes
      if (html.includes("<blockquote>")) {
        html = html.replaceAll("<br>", "");
        botResponse = getBotResponse(html);
      }
      // check for image
      if (html.includes("<img")) {
        html = html.replaceAll("<img", '<img class="imgcard_mrkdwn" ');
        botResponse = getBotResponse(html);
      }
      // check for preformatted text
      if (html.includes("<pre") || html.includes("<code>")) {
        botResponse = getBotResponse(html);
      }
      // check for list text
      if (
        html.includes("<ul") ||
        html.includes("<ol") ||
        html.includes("<li") ||
        html.includes("<h3")
      ) {
        html = html.replaceAll("<br>", "");
        // botResponse = `<img class="botAvatar" src="./statics/img/sara_avatar.png"/><span class="botMsg">${html}</span><div class="clearfix"></div>`;
        botResponse = getBotResponse(html);
      } else {
        // if no markdown formatting found, render the text as it is.
        if (!botResponse) {
          botResponse = `<img class="botAvatar" src="./statics/img/botAvatar_old.png"/><p class="botMsg">${response}</p><div class="clearfix"></div>`;
        }
      }
      // append the bot response on to the chat screen
      $(botResponse).appendTo(".chats").hide().fadeIn(1000);
      scrollToBottomOfResults();
    }
    $(".usrInput").focus();
  }, 500);
}

/**
 * sends the user message to the rasa server,
 * @param {String} message user message
 */
async function send(message) {
  await new Promise((r) => setTimeout(r, 2000));
  $.ajax({
    url: `${backendUrl}/api/chatbot/document/messages/`,
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      text: message,
      doc_id: 4
    }),
    success(botResponse, status) {
      console.log("Response from Rasa: ", botResponse, "\nStatus: ", status);

      // if user wants to restart the chat and clear the existing chat contents
      if (message.toLowerCase() === "/restart") {
        $("#userInput").prop("disabled", false);

        // if you want the bot to start the conversation after restart
        // customActionTrigger();
        return;
      }
      var messageId = botResponse.id;
      // Check the status of messageId here
      var checkStatusInterval = setInterval(function() {
        // TODO: set timeout
          fetch(`${backendUrl}/api/chatbot/messages/track/${messageId}/`)
          .then(function(response) {
              return response.json();
          }).then(function(data) {
              hideBotTyping();
              if (data.status === 'SUCCESS') {
                  clearInterval(checkStatusInterval);
                  // Append the response message to the chatbox
                  setBotResponse(data.result);
              } else if (data.status === 'FAILURE') {
                  clearInterval(checkStatusInterval);
                  setBotResponse("مشکل از سمت سرور")
              } else {
                showBotTyping();
              }
          });
      }, 1000); // Check status every second
    },
    error(xhr, textStatus) {
      if (message.toLowerCase() === "/restart") {
        $("#userInput").prop("disabled", false);
        // if you want the bot to start the conversation after the restart action.
        // actionTrigger();
        // return;
      }

      // if there is no response from rasa server, set error bot response
      setBotResponse("");
      console.log("Error from bot end: ", textStatus);
    },
  });
}
/**
 * sends an event to the bot,
 *  so that bot can start the conversation by greeting the user
 *
 * `Note: this method will only work in Rasa 1.x`
 */
// eslint-disable-next-line no-unused-vars
function actionTrigger() {
  $.ajax({
    url: `http://localhost:5005/conversations/${sender_id}/execute`,
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      name: action_name,
      policy: "MappingPolicy",
      confidence: "0.98",
    }),
    success(botResponse, status) {
      console.log("Response from Rasa: ", botResponse, "\nStatus: ", status);

      if (Object.hasOwnProperty.call(botResponse, "messages")) {
        setBotResponse(botResponse.messages);
      }
      $("#userInput").prop("disabled", false);
    },
    error(xhr, textStatus) {
      // if there is no response from rasa server
      setBotResponse("");
      console.log("Error from bot end: ", textStatus);
      $("#userInput").prop("disabled", false);
    },
  });
}

/**
 * sends an event to the custom action server,
 *  so that bot can start the conversation by greeting the user
 *
 * Make sure you run action server using the command
 * `rasa run actions --cors "*"`
 *
 * `Note: this method will only work in Rasa 2.x`
 */
// eslint-disable-next-line no-unused-vars
function customActionTrigger() {
  $.ajax({
    url: "http://localhost:5055/webhook/",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({
      next_action: action_name,
      tracker: {
        sender_id,
      },
    }),
    success(botResponse, status) {
      console.log("Response from Rasa: ", botResponse, "\nStatus: ", status);

      if (Object.hasOwnProperty.call(botResponse, "responses")) {
        setBotResponse(botResponse.responses);
      }
      $("#userInput").prop("disabled", false);
    },
    error(xhr, textStatus) {
      // if there is no response from rasa server
      setBotResponse("");
      console.log("Error from bot end: ", textStatus);
      $("#userInput").prop("disabled", false);
    },
  });
}

/**
 * clears the conversation from the chat screen
 * & sends the `/resart` event to the Rasa server
 */
function restartConversation() {
  $("#userInput").prop("disabled", true);
  // destroy the existing chart
  $(".collapsible").remove();

  if (typeof chatChart !== "undefined") {
    chatChart.destroy();
  }

  $(".chart-container").remove();
  if (typeof modalChart !== "undefined") {
    modalChart.destroy();
  }
  $(".chats").html("");
  $(".usrInput").val("");

  showBotTyping();
  setBotResponse("سلام 👋<br>" + 
          "من دستیار هوشمند مالیاتی شما هستم.<br>" +
          "چگونه می‌توانم به شما کمک کنم؟");

  }
// triggers restartConversation function.
$("#restart").click(() => {
  restartConversation();
});

/**
 * if user hits enter or send button
 * */
$(".usrInput").on("keyup keypress", (e) => {
  const keyCode = e.keyCode || e.which;

  const text = $(".usrInput").val();
  if (keyCode === 13) {
    if (text === "" || $.trim(text) === "") {
      e.preventDefault();
      return false;
    }
    // destroy the existing chart, if yu are not using charts, then comment the below lines
    $(".collapsible").remove();
    $(".dropDownMsg").remove();
    if (typeof chatChart !== "undefined") {
      chatChart.destroy();
    }

    $(".chart-container").remove();
    if (typeof modalChart !== "undefined") {
      modalChart.destroy();
    }

    $("#paginated_cards").remove();
    $(".suggestions").remove();
    $(".quickReplies").remove();
    $(".usrInput").blur();
    setUserResponse(text);
    send(text);
    e.preventDefault();
    return false;
  }
  return true;
});

$("#sendButton").on("click", (e) => {
  const text = $(".usrInput").val();
  if (text === "" || $.trim(text) === "") {
    e.preventDefault();
    return false;
  }
  // destroy the existing chart
  if (typeof chatChart !== "undefined") {
    chatChart.destroy();
  }

  $(".chart-container").remove();
  if (typeof modalChart !== "undefined") {
    modalChart.destroy();
  }

  $(".suggestions").remove();
  $("#paginated_cards").remove();
  $(".quickReplies").remove();
  $(".usrInput").blur();
  $(".dropDownMsg").remove();
  setUserResponse(text);
  send(text);
  e.preventDefault();
  return false;
});

$("#recordButton").on("click", (e) => {
  $('#recordButton').hide();
  $('#stopButton').show();

  $(".suggestions").remove();
  $("#paginated_cards").remove();
  $(".quickReplies").remove();
  $(".usrInput").blur();
  $(".dropDownMsg").remove();

  navigator.mediaDevices.getUserMedia({ audio: true })
  .then(function(stream) {
      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.start();

      mediaRecorder.addEventListener('dataavailable', function(event) {
          audioChunks.push(event.data);
      });
  });

  e.preventDefault();
  return false;
});

$("#stopButton").on("click", (e) => {
  $('#stopButton').hide();
  $('#recordButton').show();

  $(".suggestions").remove();
  $("#paginated_cards").remove();
  $(".quickReplies").remove();
  $(".usrInput").blur();
  $(".dropDownMsg").remove();

  mediaRecorder.stop();

  mediaRecorder.addEventListener('stop', function() {
      var audioBlob = new Blob(audioChunks);
      var audioUrl = URL.createObjectURL(audioBlob);
      addAudioMessage(audioUrl);
      var formData = new FormData();
      formData.append('audio', audioBlob);

      // Send the audio data to your backend here
      fetch(`${backendUrl}/api/chatbot/document/messages/`, {
          method: 'POST',
          body: formData,
          headers: {
              // 'Content-Type': 'multipart/form-data',
              'Access-Control-Allow-Origin': '*',
          }
      }).then(function(response) {
          return response.json();
      }).then(function(data) {
          var messageId = data.id;
          // Check the status of messageId here
          var checkStatusInterval = setInterval(function() {
              fetch(`${backendUrl}/api/chatbot/messages/track/${messageId}/`)
              .then(function(response) {
                  return response.json();
              }).then(function(data) {
                  hideBotTyping();
                  if (data.status === 'SUCCESS') {
                      clearInterval(checkStatusInterval);
                      // Append the response message to the chatbox
                      setBotResponse(data.result);
                  } else if (data.status === 'FAILURE') {
                      clearInterval(checkStatusInterval);
                      setBotResponse("مشکل از سمت سرور")
                  } else {
                    showBotTyping();
                  }
              });
          }, 1000); // Check status every second
      });

      // Clear the audio chunks for the next recording
      audioChunks = [];
    });

  e.preventDefault();
  return false;
});

async function addAudioMessage(audioUrl) {
  const waveId = 'waveform' + Date.now(); // Unique ID

  const audioElement = document.createElement('div');
  audioElement.className = 'waveform';
  audioElement.id = `${waveId}`;

  const audioTimelineElement = document.createElement('div');
  audioTimelineElement.className = 'waveform-timeline';
  audioTimelineElement.id = `${waveId}-timeline`;
  audioElement.appendChild(audioTimelineElement);

  const playBtn = document.createElement('button');
  playBtn.className = 'play-button';
  playBtn.id = `${waveId}-btn`;

  const playBtnIcon = document.createElement('img');
  playBtnIcon.className = 'play-button-icon';
  playBtnIcon.src = './statics/img/play.svg';
  playBtn.appendChild(playBtnIcon);

  const user_response = `<img class="userAvatar" src='./statics/img/userAvatar.jpg'><div class="userMsg">`+
  `<div id="${waveId}-box" class="waveform-box">${audioElement.outerHTML}</div>` +
  `</div><div class="clearfix"></div>`;
  $(user_response).appendTo(".chats").show("slow");
  $(".usrInput").val("");
  scrollToBottomOfResults();
  showBotTyping();
  $(".suggestions").remove();

  const wavesurfer = WaveSurfer.create({
    container: `#${waveId}`,
    waveColor: '#FFFFFF',
    responsive: true,
    progressColor: 'purple',
    cursorColor: 'none',
    height: 20, // the height of the waveform
    plugins: [
      WaveSurfer.Timeline.create({
        container: `#${waveId}-timeline`
      }),
    ],
  });

  wavesurfer.on('finish', function () {
    playBtnIcon.src = "./statics/img/play.svg";
  });

  playBtn.addEventListener("click", function() {
    wavesurfer.playPause()
    const isPlaying = wavesurfer.isPlaying();
    if (isPlaying === true) {
      playBtnIcon.src = "./statics/img/pause.svg";
    } else {
      playBtnIcon.src = "./statics/img/play.svg";
    }
  });
  document.querySelector(`#${waveId}-box`).appendChild(playBtn);

  await wavesurfer.load(audioUrl);
}
