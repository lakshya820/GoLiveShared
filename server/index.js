console.log("from server side");
const express = require("express");
const speech = require("@google-cloud/speech");

require('dotenv').config();

// Imports the fs library to establish file system
const fs = require('fs');

//use logger
const logger = require("morgan");

//use body parser
const bodyParser = require("body-parser");

//use corrs
const cors = require("cors");

//use openAI
const {OpenAI} = require("openai")

const http = require("http");
const { Server } = require("socket.io");

const app = express();

app.use(cors());
app.use(logger("dev"));

app.use(bodyParser.json());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "https://golive4.onrender.com",
    methods: ["GET", "POST"],
  },
});

const videoFileMap={
  'cdn':'videos/cdn.mp4',
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY // This is also the default, can be omitted
});

//TODO: Create this file in the server directory of the project
process.env.GOOGLE_APPLICATION_CREDENTIALS = "./speech-to-text-key.json";

const speechClient = new speech.SpeechClient();

app.get('/videos/:filename', (req, res)=>{
  const fileName = req.params.filename;
  const filePath = videoFileMap[fileName]
  if(!filePath){
      return res.status(404).send('File not found')
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if(range){
      const parts = range.replace(/bytes=/, '').split('-')
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      const chunksize = end - start + 1;
      const file = fs.createReadStream(filePath, {start, end});
      const head = {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4'
      };
      res.writeHead(206, head);
      file.pipe(res);
  }
  else{
      const head = {
          'Content-Length': fileSize,
          'Content-Type': 'video/mp4'
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res)
  }
})

io.on("connection", (socket) => {
  let recognizeStream = null;
  console.log("** a user connected - " + socket.id + " **\n");

  socket.on("disconnect", () => {
    console.log("** user disconnected ** \n");
  });

  socket.on("send_message", (message) => {
    setTimeout(() => {
      //io.emit("receive_message", "got this message " + message);
    }, 1000);
  });

  socket.on("startGoogleCloudStream", function (data) {
    startRecognitionStream(this, data);
  });

  socket.on("endGoogleCloudStream", function () {
    console.log("** ending google cloud stream **\n");
    stopRecognitionStream();
  });

  socket.on('lexanswers', async (data) => {
    console.log('Received answers from Lex:', data);
    answers=data;

    socket.on('lexquestions',async (data) => {
      console.log('Received questions from Lex:', data);
      questions=data;
      if(questions !== null){
        
        grammarCorrectionResult = await grammarcorrection(answers, questions);
        console.log("grammarReceived", grammarCorrectionResult);
        io.emit("grammarCorrectionResult", grammarCorrectionResult);
        //io.emit("questions", questions);

      }
    });

  });

  socket.on("send_audio_data", async (audioData) => {
    io.emit("receive_message", "Got audio data");
    if (recognizeStream !== null) {
      try {
        //console.log(`audio data: `, audioData.audio);
        recognizeStream.write(audioData.audio);
      } catch (err) {
        console.log("Error calling google api " + err);
      }
    } else {
      console.log("RecognizeStream is null");
    }
  });

  function startRecognitionStream(client) {
    console.log("* StartRecognitionStream\n");
    try {
      recognizeStream = speechClient
        .streamingRecognize(config)
        .on("error", console.error)
        .on("data", (data) => {
          console.log("StartRecognitionStream: data: "+data)
          const result = data.results[0];
          const isFinal = result.isFinal;

          const transcription = data.results
            .map((result) => result.alternatives[0].transcript)
            .join("\n");

          console.log(`Transcription: `, transcription);
          console.log(isFinal);

          client.emit("receive_audio_text", {
            text: transcription,
            isFinal: isFinal,
          });

          // if end of utterance, let's restart stream
          // this is a small hack to keep restarting the stream on the server and keep the connection with Google api
          // Google api disconects the stream every five minutes
          if (data.results[0] && data.results[0].isFinal) {
            stopRecognitionStream();
            startRecognitionStream(client);
          }
        });
    } catch (err) {
      console.error("Error streaming google api " + err);
    }
  }

  function stopRecognitionStream() {
    if (recognizeStream) {
      console.log("* StopRecognitionStream \n");
      recognizeStream.end();
    }
    recognizeStream = null;
  }
});

async function grammarcorrection(grammarArray, questions) {
   
  // Initialize arrays for each function call
  let correctedGrammarArray = [];
  let correct = [];
  let incorrect = [];
  let count = 0;
  let total;
  const sentences = grammarArray;
 
 
 
 //console.log("sentences: ", sentences);
 try {
     // Iterate over each string in the grammarArray
     for (const grammar of grammarArray) {
         const completion = await openai.chat.completions.create({
             model: "gpt-4o-mini",
             messages: [
                 {
                     role: "system",
                     content: "You will be provided with statements. If a statement is already grammatically correct (e.g., 'I don't know', 'I've been eating a lot') do not change it.  Do not add any commas even if needed. Accept casual English, including abbreviations and slang. Focus on fixing major grammatical errors like verb tenses, subject-verb agreement, and sentence structure, but leave informal language as it is (e.g., 'I'm gonna', 'wanna', 'LOL')."
                 },
                 {
                     role: "user",
                     content: grammar
                 }
             ],
             temperature: 0,
             max_tokens: 60,
             top_p: 1.0,
             frequency_penalty: 0.0,
             presence_penalty: 0.0,
         });

         const grammarResult = completion.choices[0].message.content;
         //console.log("grammarresult_backend", grammarResult);

         // Push the corrected result into the array
         correctedGrammarArray.push(grammarResult);
     }

     const incorrect = grammarArray.flatMap(text =>
       text.split(/(?<=\.)\s*/).filter(sentence => sentence.trim() !== "")
     );
     console.log("incorrect: ", incorrect);

     const correct = correctedGrammarArray.flatMap(text =>
       text.split(/(?<=\.)\s*/).filter(sentence => sentence.trim() !== "")
     );
     console.log("correct: ", correct);

     for (let i = 0; i < sentences.length; i++) {
       if(sentences[i] !== correctedGrammarArray[i]){
         // incorrect.push(sentences[i]);
         // correct.push(correctedGrammarArray[i]);
         count++;
       }
     }
     
     //console.log("correctedgrammararray: ", correctedGrammarArray);
 } catch (error) {
     console.log("error", `Something happened! like: ${error}`);
     next(error); // If you're using this in an Express route, pass the error to the next middleware
 }

 total=(1-(count/(sentences.length)))*100;
 // console.log("counr:", count);
 // console.log("length:", grammarArray.length);
 // console.log("total:", total);
 // Return the array of corrected results
 return {
   questions,
   grammarArray,
   correctedGrammarArray,
   total
 };
}


const port = process.env.PORT || 8081;
server.listen(port, () => {
  console.log("WebSocket server listening on port ${port}.");
});

// =========================== GOOGLE CLOUD SETTINGS ================================ //

// The encoding of the audio file, e.g. 'LINEAR16'
// The sample rate of the audio file in hertz, e.g. 16000
// The BCP-47 language code to use, e.g. 'en-US'
const encoding = "LINEAR16";
const sampleRateHertz = 16000;
const languageCode = "en-US"
const alternativeLanguageCodes = ["en-IN"];

const config = {
  config: {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
    alternativeLanguageCodes: alternativeLanguageCodes,
    //enableWordTimeOffsets: true,  
    enableAutomaticPunctuation: true,
    //enableWordConfidence: true,
    //Speker deserilization
    //enableSpeakerDiarization: true,  
    //minSpeakerCount: 1,  
    //Silence detection
    enable_silence_detection: true,
    //no_input_timeout: 5,
    single_utterance : false, //
    interimResults: false,
    //diarizationSpeakerCount: 2,
    //model: "video",
    model: "latest_long",
    //model: "phone_call",
    //model: "command_and_search",
    useEnhanced: true,
  },
};
