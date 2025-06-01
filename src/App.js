/* global __app_id, __firebase_config, __api_key, __initial_auth_token */
import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, query, onSnapshot, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';

// Global variables provided by the Canvas environment or environment variables (for Firebase Hosting)
const appId = typeof __app_id !== 'undefined' ? __app_id : (typeof process !== 'undefined' && process.env.REACT_APP_APP_ID ? process.env.REACT_APP_APP_ID : 'default-app-id');

const firebaseConfig = typeof __firebase_config !== 'undefined'
  ? JSON.parse(__firebase_config)
  : (typeof process !== 'undefined' && process.env.REACT_APP_FIREBASE_CONFIG ? JSON.parse(process.env.REACT_APP_FIREBASE_CONFIG) : {});

const geminiApiKey = typeof __api_key !== 'undefined'
  ? __api_key
  : (typeof process !== 'undefined' && process.env.REACT_APP_GEMINI_API_KEY ? process.env.REACT_APP_GEMINI_API_KEY : "");

const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;


// Context for Firebase and User
const FirebaseContext = createContext(null);

const FirebaseProvider = ({ children }) => {
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    try {
      const app = initializeApp(firebaseConfig);
      const firestore = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestore);
      setAuth(firebaseAuth);

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          setUserId(user.uid);
        } else {
          // Sign in anonymously if no token is provided or if it fails
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
            } else {
              await signInAnonymously(firebaseAuth);
            }
            setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID()); // Fallback for anonymous
          } catch (error) {
            console.error("Firebase authentication failed:", error);
            setUserId(crypto.randomUUID()); // Fallback to a random ID if auth fails
          }
        }
        setIsAuthReady(true);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error("Failed to initialize Firebase:", error);
      setIsAuthReady(true); // Ensure app can still render even if Firebase fails
    }
  }, []);

  return (
    <FirebaseContext.Provider value={{ db, auth, userId, isAuthReady }}>
      {children}
    </FirebaseContext.Provider>
  );
};

// Reusable Section Wrapper for Collapsible Sections
const SectionWrapper = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <button
        className="w-full flex justify-between items-center text-xl font-semibold text-gray-800 focus:outline-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        {title}
        <svg
          className={`w-6 h-6 transform transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M19 9l-7 7-7-7"
          ></path>
        </svg>
      </button>
      {isOpen && <div className="mt-4 border-t border-gray-200 pt-4">{children}</div>}
    </div>
  );
};

// Dropdown Data
const dropdownData = {
  gender: ['Male', 'Female', 'Non-binary', 'Other'], // Re-using existing gender options
  faceShape: ['Round', 'Oval', 'Square', 'Heart', 'Diamond'],
  skinColor: ['Fair', 'Light', 'Medium', 'Olive', 'Dark'],
  bodyTypePosture: ['Slim', 'Athletic', 'Average', 'Curvy', 'Muscular', 'Elderly', 'Slouching', 'Upright'],
  // Updated age options for human characters
  // age: ['Bayi', 'Belasan', 'Remaja', 'Dewasa', 'Tua'], // Now a text input
  // Updated age options for animal characters with detailed prompts
  animalAge: [
    { label: 'Bayi (0–2 tahun)', value: 'baby-like, tiny proportions, big eyes, oversized head' },
    { label: 'Balita (3–5 tahun)', value: 'toddler-style, playful and chubby, short legs' },
    { label: 'Anak Kecil (6–8 tahun)', value: 'childlike, energetic, round face, cheerful' },
    { label: 'Pra-Remaja (9–12 tahun)', value: 'youthful, slightly mischievous, small and lanky' },
    { label: 'Remaja Awal (13–15 tahun)', value: 'awkward teen, slim build, growing up phase' },
    { label: 'Remaja (16–18 tahun)', value: 'confident teenager, casual style, expressive' },
    { label: 'Dewasa Muda (19–30 tahun)', value: 'young adult, well-proportioned, stylish' },
    { label: 'Dewasa (31–50 tahun)', value: 'mature character, balanced, calm expression' },
    { label: 'Lansia (50+ tahun)', value: 'elderly, gray fur, wrinkles, gentle demeanor' },
    { label: 'Karakter Tua & Bijak (Fabel)', value: 'ancient creature, long beard, wise eyes, walking cane' },
  ],
  animalBodyShape: ['Slim', 'Chubby Round', 'Muscular', 'Graceful', 'Stocky'],
  faceFeature: ['Chubby', 'Cute', 'Sharp', 'Angular', 'Soft'],
  earFeature: ['Pointy', 'Rounded', 'Floppy', 'Large', 'Small'],
  furCharacteristic: ['Soft', 'Fluffy', 'Short', 'Long', 'Wiry', 'Smooth', 'Patterned'],
  expression: ['Happy', 'Angry', 'Sad', 'Confused', 'Surprised', 'Neutral', 'Excited', 'Worried', 'Determined'],
  timeOfDay: ['Morning', 'Afternoon', 'Evening', 'Night', 'Golden Hour', 'Blue Hour', 'Dawn', 'Dusk'],
  cameraMotion: [
    { en: 'Static Shot', id: 'Bidikan Statis' },
    { en: 'Pan Left', id: 'Geser Kiri' },
    { en: 'Pan Right', id: 'Geser Kanan' },
    { en: 'Tilt Up', id: 'Miring ke Atas' },
    { en: 'Tilt Down', id: 'Miring ke Bawah' },
    { en: 'Zoom In', id: 'Perbesar' },
    { en: 'Zoom Out', id: 'Perkecil' },
    { en: 'Dolly In', id: 'Gerakan Dolly Masuk' },
    { en: 'Dolly Out', id: 'Gerakan Dolly Keluar' },
    { en: 'Dolly Left', id: 'Gerakan Dolly Kiri' },
    { en: 'Dolly Right', id: 'Gerakan Dolly Kanan' },
    { en: 'Pedestal Up', id: 'Angkat Kamera ke Atas' },
    { en: 'Pedestal Down', id: 'Turunkan Kamera ke Bawah' },
    { en: 'Truck Left', id: 'Gerakan Truk Kiri' },
    { en: 'Truck Right', id: 'Gerakan Truk Kanan' },
    { en: 'Arc Left', id: 'Busur Kiri' },
    { en: 'Arc Right', id: 'Busur Kanan' },
    { en: 'Whip Pan', id: 'Geser Cepat' },
    { en: 'Crash Zoom', id: 'Perbesar Mendadak' },
    { en: 'Bullet Time', id: 'Waktu Peluru' },
    { en: 'FPV Drone', id: 'Drone Sudut Pandang Orang Pertama' },
    { en: 'Aerial Perspective', id: 'Perspektif Udara' },
    { en: 'Tracking Shot', id: 'Bidikan Mengikuti' },
    { en: '360 Orbit', id: 'Orbit 360 Derajat' },
    { en: 'Crane Up', id: 'Angkat Derek ke Atas' },
    { en: 'Crane Down', id: 'Turunkan Derek ke Bawah' },
    { en: 'Dolly Zoom', id: 'Efek Vertigo' },
    { en: 'Robo Arm', id: 'Lengan Robot' },
    { en: 'Super Dolly In', id: 'Gerakan Dolly Sangat Dekat' },
    { en: 'Focus Change', id: 'Perubahan Fokus' },
    { en: 'Through Object', id: 'Melalui Objek' },
    { en: 'Lazy Susan', id: 'Putaran Lambat' },
    { en: 'Action Run', id: 'Lari Aksi' },
    { en: 'Handheld', id: 'Genggam Tangan' },
    { en: 'Dutch Angle', id: 'Sudut Belanda' },
    { en: 'Car Grip', id: 'Genggam Mobil' },
    { en: 'Hyperlapse', id: 'Hiperlapse' },
    { en: 'Low Shutter', id: 'Rana Lambat' },
    { en: 'Fisheye', id: 'Mata Ikan' },
  ],
  lighting: ['Soft lighting', 'Harsh light', 'Backlight', 'Cinematic lighting', 'Natural light', 'Dramatic lighting', 'Studio lighting', 'Ambient light'],
  videoMood: ['Aesthetic', 'Cheerful', 'Cozy', 'Dark', 'Mysterious', 'Dramatic', 'Magical', 'Energetic', 'Calm', 'Suspenseful', 'Whimsical', 'Gritty', 'Dreamy'],
};

const visualStyles = {
  visualTechnique: ['2D', '2.5D', '3D', 'Stop-motion', 'Claymation', 'Pixel Art', 'Rotoscoping'],
  artisticStyle: ['Cinematic', 'Realistic', 'Semi-realistic', 'Cartoon', 'Anime', 'Silhouette', 'Line Art', 'Flat Design', 'Papercut Style', 'Sketch/Doodle Style', 'Minimalist', 'Surrealistic', 'Vaporwave', 'Cyberpunk', 'Retro Futurism', 'Noir', 'Steampunk'],
  studioBrandStyle: ['Disney Style', 'Pixar Style', 'DreamWorks Style', 'Illumination Style', 'Ghibli Style', 'Laika Style', 'Nickelodeon Style', 'Cartoon Network Style', 'Webtoon Style', 'Marvel/Comic Book Style', 'Roblox/Low Poly Style'],
};

// Main App Component
const App = () => {
  const { db, userId, isAuthReady } = useContext(FirebaseContext);

  // Form States
  const [characterName, setCharacterName] = useState('');
  const [characterType, setCharacterType] = useState(''); // human, animal4, animal2, fantasy
  const [humanDetails, setHumanDetails] = useState({});
  const [animal4Details, setAnimal4Details] = useState({});
  const [animal2Details, setAnimal2Details] = useState({});
  const [fantasyDetails, setFantasyDetails] = useState('');

  const [savedCharacters, setSavedCharacters] = useState([]);
  const [selectedCharactersForActions, setSelectedCharactersForActions] = useState([]); // Array of character IDs
  const [characterActions, setCharacterActions] = useState([]); // [{ charId, action, isMain, dialogueLines: [{type, sentence}] }]

  const [expressions, setExpressions] = useState({}); // {charId: 'happy'}
  const [location, setLocation] = useState('');
  const [timeOfDay, setTimeOfDay] = useState('');
  const [cameraMotion, setCameraMotion] = useState('');
  const [lighting, setLighting] = useState('');
  const [selectedVisualStyles, setSelectedVisualStyles] = useState([]); // Array of selected styles
  const [videoMood, setVideoMood] = useState('');
  const [soundMusic, setSoundMusic] = useState('');
  const [spokenDialogue, setSpokenDialogue] = useState([]); // [{ charId, type, sentence, targetCharId (optional) }]
  const [additionalDetails, setAdditionalDetails] = useState('');

  // Output States
  const [indonesianPrompt, setIndonesianPrompt] = useState('');
  const [englishPrompt, setEnglishPrompt] = useState('');
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');

  // LLM Loading States for new features
  const [isLoadingActionSuggestion, setIsLoadingActionSuggestion] = useState({}); // {charId: true/false}
  const [isLoadingDialogueSuggestion, setIsLoadingDialogueSuggestion] = useState({}); // {index: true/false}

  // Draft Management States (Removed from UI, but logic remains for potential future use or if user wants to re-add)
  const [drafts, setDrafts] = useState([]);
  const [currentDraftId, setCurrentDraftId] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch drafts on component mount and when auth is ready
  useEffect(() => {
    if (db && userId && isAuthReady) {
      const q = query(collection(db, `artifacts/${appId}/users/${userId}/prompt_drafts`));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const fetchedDrafts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setDrafts(fetchedDrafts);
      }, (error) => {
        console.error("Error fetching drafts:", error);
        setModalMessage("Error loading drafts. Please try again.");
        setShowModal(true);
      });

      return () => unsubscribe();
    }
  }, [db, userId, isAuthReady]);

  // Function to show custom modal
  const showCustomModal = (message) => {
    setModalMessage(message);
    setShowModal(true);
  };

  // Function to save a prompt draft
  const savePromptDraft = async () => {
    if (!db || !userId) {
      showCustomModal("Firebase not initialized or user not authenticated. Cannot save draft.");
      return;
    }

    setIsSaving(true);
    try {
      const promptData = {
        characterName,
        characterType,
        humanDetails,
        animal4Details,
        animal2Details,
        fantasyDetails,
        savedCharacters,
        selectedCharactersForActions,
        characterActions,
        expressions,
        location,
        timeOfDay,
        cameraMotion,
        lighting,
        selectedVisualStyles,
        videoMood,
        soundMusic,
        spokenDialogue,
        additionalDetails,
        indonesianPrompt,
        englishPrompt,
        timestamp: serverTimestamp(),
      };

      if (currentDraftId) {
        await setDoc(doc(db, `artifacts/${appId}/users/${userId}/prompt_drafts`, currentDraftId), promptData);
        showCustomModal("Draft updated successfully!");
      } else {
        const docRef = await addDoc(collection(db, `artifacts/${appId}/users/${userId}/prompt_drafts`), promptData);
        setCurrentDraftId(docRef.id);
        showCustomModal("Draft saved successfully!");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      showCustomModal("Error saving draft. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Function to load a prompt draft
  const loadPromptDraft = (draft) => {
    setCharacterName(draft.characterName || '');
    setCharacterType(draft.characterType || '');
    setHumanDetails(draft.humanDetails || {});
    setAnimal4Details(draft.animal4Details || {});
    setAnimal2Details(draft.animal2Details || {});
    setFantasyDetails(draft.fantasyDetails || '');
    setSavedCharacters(draft.savedCharacters || []);
    setSelectedCharactersForActions(draft.selectedCharactersForActions || []);
    setCharacterActions(draft.characterActions || []);
    setExpressions(draft.expressions || {});
    setLocation(draft.location || '');
    setTimeOfDay(draft.timeOfDay || '');
    setCameraMotion(draft.cameraMotion || '');
    setLighting(draft.lighting || '');
    setSelectedVisualStyles(draft.selectedVisualStyles || []);
    setVideoMood(draft.videoMood || '');
    setSoundMusic(draft.soundMusic || '');
    setSpokenDialogue(draft.spokenDialogue || []);
    setAdditionalDetails(draft.additionalDetails || '');
    setIndonesianPrompt(draft.indonesianPrompt || '');
    setEnglishPrompt(draft.englishPrompt || '');
    setCurrentDraftId(null); // Clear current draft ID after loading, so saving creates a new one
    showCustomModal("Draft loaded successfully!");
  };

  // Function to delete a prompt draft
  const deletePromptDraft = async (id) => {
    if (!db || !userId) {
      showCustomModal("Firebase not initialized or user not authenticated. Cannot delete draft.");
      return;
    }
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/prompt_drafts`, id));
      if (currentDraftId === id) {
        setCurrentDraftId(null); // Clear current draft if deleted
        resetForm();
      }
      showCustomModal("Draft deleted successfully!");
    } catch (error) {
      console.error("Error deleting draft:", error);
      showCustomModal("Error deleting draft. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Function to reset the form
  const resetForm = () => {
    setCharacterName('');
    setCharacterType('');
    setHumanDetails({});
    setAnimal4Details({});
    setAnimal2Details({});
    setFantasyDetails('');
    setSavedCharacters([]);
    setSelectedCharactersForActions([]);
    setCharacterActions([]);
    setExpressions({});
    setLocation('');
    setTimeOfDay('');
    setCameraMotion('');
    setLighting('');
    setSelectedVisualStyles([]);
    setVideoMood('');
    setSoundMusic('');
    setSpokenDialogue([]);
    setAdditionalDetails('');
    setIndonesianPrompt('');
    setEnglishPrompt('');
    setCurrentDraftId(null);
    showCustomModal("Form reset successfully!");
  };

  // Character Management
  const handleSaveCharacter = () => {
    if (!characterName) {
      showCustomModal("Character Name is required to save a character.");
      return;
    }

    const newCharacter = {
      id: Date.now().toString(), // Simple unique ID
      name: characterName,
      type: characterType,
      details: {},
    };

    switch (characterType) {
      case 'human':
        newCharacter.details = humanDetails;
        break;
      case 'animal4':
        newCharacter.details = animal4Details;
        break;
      case 'animal2':
        newCharacter.details = animal2Details;
        break;
      case 'fantasy':
        newCharacter.details = fantasyDetails;
        break;
      default:
        showCustomModal("Please select a character type.");
        return;
    }

    setSavedCharacters([...savedCharacters, newCharacter]);
    setCharacterName(''); // Clear character name after saving
    setCharacterType(''); // Clear character type
    setHumanDetails({});
    setAnimal4Details({});
    setAnimal2Details({});
    setFantasyDetails('');
    showCustomModal(`Character "${newCharacter.name}" saved!`);
  };

  // LLM Feature: Suggest Character Actions
  const suggestCharacterAction = async (charId) => {
    setIsLoadingActionSuggestion(prev => ({ ...prev, [charId]: true }));
    const character = savedCharacters.find(sc => sc.id === charId);
    if (!character) {
      showCustomModal("Karakter tidak ditemukan.");
      setIsLoadingActionSuggestion(prev => ({ ...prev, [charId]: false }));
      return;
    }

    const prompt = `Sarankan satu aksi singkat dan dinamis untuk karakter ${character.name} yang berjenis ${character.type}. Contoh: berlari, melompat, berbicara. Output hanya aksinya saja dalam bahasa Indonesia.`;

    try {
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };
      // Gunakan geminiApiKey yang sudah disesuaikan
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error (suggestCharacterAction):", response.status, errorText);
        showCustomModal(`Gagal menyarankan aksi. Status: ${response.status}. Detail: ${errorText.substring(0, 100)}...`);
        return;
      }

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const generatedAction = result.candidates[0].content.parts[0].text.trim();
        handleCharacterActionChange(charId, 'action', generatedAction);
        showCustomModal(`Aksi untuk ${character.name} disarankan: "${generatedAction}"`);
      } else {
        showCustomModal("Gagal menyarankan aksi. Respon API tidak terduga.");
        console.error("API response error:", result);
      }
    } catch (error) {
      console.error("Error calling Gemini API for action suggestion:", error);
      showCustomModal("Terjadi kesalahan saat menyarankan aksi. Coba lagi.");
    } finally {
      setIsLoadingActionSuggestion(prev => ({ ...prev, [charId]: false }));
    }
  };

  // LLM Feature: Suggest Dialogue
  const suggestDialogueSentence = async (dialogueIndex) => {
    setIsLoadingDialogueSuggestion(prev => ({ ...prev, [dialogueIndex]: true }));
    const dialogue = spokenDialogue[dialogueIndex];
    const character = savedCharacters.find(sc => sc.id === dialogue.charId);

    if (!character || !dialogue.type) {
      showCustomModal("Pilih karakter dan jenis dialog terlebih dahulu.");
      setIsLoadingDialogueSuggestion(prev => ({ ...prev, [dialogueIndex]: false }));
      return;
    }

    let prompt = `Sarankan kalimat dialog untuk karakter ${character.name}. Jenis dialog: ${dialogue.type === 'Ask a question' ? 'pertanyaan' : 'jawaban'}. Konteks umum: ${location || 'tidak ada lokasi'}, ${timeOfDay || 'tidak ada waktu'}. Output hanya kalimat dialognya saja dalam bahasa Indonesia.`;
    if (dialogue.type === 'Ask a question' && dialogue.targetCharId) {
      const targetChar = savedCharacters.find(sc => sc.id === dialogue.targetCharId);
      if (targetChar) {
        prompt = `Sarankan pertanyaan yang diajukan oleh ${character.name} kepada ${targetChar.name}. Konteks umum: ${location || 'tidak ada lokasi'}, ${timeOfDay || 'tidak ada waktu'}. Output hanya kalimat dialognya saja dalam bahasa Indonesia.`;
      }
    } else if (dialogue.type === 'Give an answer' && dialogue.targetCharId) {
      const targetChar = savedCharacters.find(sc => sc.id === dialogue.targetCharId);
      if (targetChar) {
        prompt = `Sarankan jawaban yang diberikan oleh ${character.name} kepada ${targetChar.name}. Konteks umum: ${location || 'tidak ada lokasi'}, ${timeOfDay || 'tidak ada waktu'}. Output hanya kalimat dialognya saja dalam bahasa Indonesia.`;
      }
    } else if (dialogue.type === 'Berbicara ke Audiens') {
      prompt = `Sarankan kalimat yang diucapkan oleh ${character.name} langsung ke kamera (seolah berbicara kepada penonton). Konteks umum: ${location || 'tidak ada lokasi'}, ${timeOfDay || 'tidak ada waktu'}. Output hanya kalimat dialognya saja dalam bahasa Indonesia.`;
    }


    try {
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };
      // Gunakan geminiApiKey yang sudah disesuaikan
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error (suggestDialogueSentence):", response.status, errorText);
        showCustomModal(`Gagal menyarankan dialog. Status: ${response.status}. Detail: ${errorText.substring(0, 100)}...`);
        return;
      }

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const generatedSentence = result.candidates[0].content.parts[0].text.trim().replace(/^"|"$/g, ''); // Remove quotes if LLM adds them
        handleSpokenDialogueChange(dialogueIndex, 'sentence', generatedSentence);
        showCustomModal(`Kalimat dialog disarankan untuk ${character.name}: "${generatedSentence}"`);
      } else {
        showCustomModal("Gagal menyarankan dialog. Respon API tidak terduga.");
        console.error("API response error:", result);
      }
    } catch (error) {
      console.error("Error calling Gemini API for dialogue suggestion:", error);
      showCustomModal("Terjadi kesalahan saat menyarankan dialog. Coba lagi.");
    } finally {
      setIsLoadingDialogueSuggestion(prev => ({ ...prev, [dialogueIndex]: false }));
    }
  };


  // Character Actions Logic
  const handleCharacterActionChange = (charId, field, value) => {
    setCharacterActions(prevActions => {
      const existingActionIndex = prevActions.findIndex(action => action.charId === charId);
      if (existingActionIndex > -1) {
        const updatedActions = [...prevActions];
        updatedActions[existingActionIndex] = {
          ...updatedActions[existingActionIndex],
          [field]: value,
        };
        return updatedActions;
      } else {
        return [...prevActions, { charId, action: '', isMain: false, dialogueLines: [], [field]: value }];
      }
    });
  };

  const handleToggleMainCharacter = (charId) => {
    setCharacterActions(prevActions => {
      const existingActionIndex = prevActions.findIndex(action => action.charId === charId);
      if (existingActionIndex > -1) {
        const updatedActions = [...prevActions];
        updatedActions[existingActionIndex] = {
          ...updatedActions[existingActionIndex],
          isMain: !updatedActions[existingActionIndex].isMain,
        };
        return updatedActions;
      } else {
        return [...prevActions, { charId, action: '', isMain: true, dialogueLines: [] }];
      }
    });
  };

  const handleAddDialogueLine = (charId) => {
    setCharacterActions(prevActions => {
      const existingActionIndex = prevActions.findIndex(action => action.charId === charId);
      if (existingActionIndex > -1) {
        const updatedActions = [...prevActions];
        updatedActions[existingActionIndex].dialogueLines.push({ type: '', sentence: '' });
        return updatedActions;
      } else {
        return [...prevActions, { charId, action: '', isMain: false, dialogueLines: [{ type: '', sentence: '' }] }];
      }
    });
  };

  const handleDialogueLineChange = (charId, lineIndex, field, value) => {
    setCharacterActions(prevActions => {
      const existingActionIndex = prevActions.findIndex(action => action.charId === charId);
      if (existingActionIndex > -1) {
        const updatedActions = [...prevActions];
        updatedActions[existingActionIndex].dialogueLines[lineIndex][field] = value;
        return updatedActions;
      }
      return prevActions;
    });
  };

  const handleRemoveDialogueLine = (charId, lineIndex) => {
    setCharacterActions(prevActions => {
      const existingActionIndex = prevActions.findIndex(action => action.charId === charId);
      if (existingActionIndex > -1) {
        const updatedActions = [...prevActions];
        updatedActions[existingActionIndex].dialogueLines.splice(lineIndex, 1);
        return updatedActions;
      }
      return prevActions;
    });
  };

  // Spoken Dialogue Logic (Separate from Character Actions dialogue)
  const handleAddSpokenDialogue = () => {
    setSpokenDialogue([...spokenDialogue, { charId: '', type: '', sentence: '', targetCharId: '' }]);
  };

  const handleSpokenDialogueChange = (index, field, value) => {
    const updatedDialogue = [...spokenDialogue];
    updatedDialogue[index][field] = value;
    setSpokenDialogue(updatedDialogue);
  };

  const handleRemoveSpokenDialogue = (index) => {
    const updatedDialogue = [...spokenDialogue];
    updatedDialogue.splice(index, 1);
    setSpokenDialogue(updatedDialogue);
  };

  // Visual Style Checkbox Handler
  const handleVisualStyleChange = (style) => {
    setSelectedVisualStyles(prevStyles =>
      prevStyles.includes(style)
        ? prevStyles.filter(s => s !== style)
        : [...prevStyles, style]
    );
  };

  // Prompt Generation
  const generateIndonesianPromptText = () => {
    let prompt = [];

    // Character Name & Description
    if (savedCharacters.length > 0) {
      const mainCharacters = characterActions.filter(ca => ca.isMain).map(ca => savedCharacters.find(sc => sc.id === ca.charId)?.name).filter(Boolean);
      if (mainCharacters.length > 0) {
        prompt.push(`Karakter utama adalah ${mainCharacters.join(' dan ')}.`);
      }

      savedCharacters.forEach(char => {
        let charDesc = `${char.name} adalah ${char.type === 'human' ? 'seorang' : 'seekor'} `;
        switch (char.type) {
          case 'human':
            charDesc += `manusia ${char.details.gender ? char.details.gender.toLowerCase() : ''}`;
            if (char.details.age) charDesc += ` berusia ${char.details.age.toLowerCase()}`; // Use text input for age
            if (char.details.skinColor) charDesc += ` dengan kulit ${char.details.skinColor.toLowerCase()}`;
            if (char.details.bodyTypePosture) charDesc += ` berbadan ${char.details.bodyTypePosture.toLowerCase()}`;
            if (char.details.clothingAccessories) charDesc += ` mengenakan ${char.details.clothingAccessories.toLowerCase()}`;
            if (char.details.additionalDetail) charDesc += `, ${char.details.additionalDetail.toLowerCase()}`;
            break;
          case 'animal4':
            charDesc += `hewan ${char.details.animalType ? char.details.animalType.toLowerCase() : ''}`;
            if (char.details.clothingAccessories) charDesc += ` mengenakan ${char.details.clothingAccessories.toLowerCase()}`;
            break;
          case 'animal2':
            charDesc += `hewan ${char.details.animalType ? char.details.animalType.toLowerCase() : ''} berjalan dengan dua kaki`;
            if (char.details.gender) charDesc += ` berjenis kelamin ${char.details.gender.toLowerCase()}`; // Add gender for animal2
            // For animal2, use the detailed age value for prompt injection
            const selectedAnimalAge = dropdownData.animalAge.find(opt => opt.value === animal2Details.age);
            if (selectedAnimalAge) charDesc += ` (${selectedAnimalAge.value})`;
            if (char.details.bodyShapePosture) charDesc += ` berbadan ${char.details.bodyShapePosture.toLowerCase()}`;
            if (char.details.furColors) charDesc += ` dengan bulu ${char.details.furColors.toLowerCase()}`;
            if (char.details.furCharacteristic) charDesc += ` yang ${char.details.furCharacteristic.toLowerCase()}`;
            if (char.details.clothingAccessories) charDesc += ` mengenakan ${char.details.clothingAccessories.toLowerCase()}`;
            break;
          case 'fantasy':
            charDesc += `makhluk fantasi. ${char.details ? char.details.toLowerCase() : ''}`;
            break;
        }
        prompt.push(charDesc + '.');
      });
    }

    // Character Actions & Expressions
    characterActions.forEach(ca => {
      const character = savedCharacters.find(sc => sc.id === ca.charId);
      if (character) {
        let actionDesc = `${character.name} sedang ${ca.action.toLowerCase()}`;
        const charExpression = expressions[ca.charId];
        if (charExpression) {
          actionDesc += ` dengan ekspresi ${charExpression.toLowerCase()}`;
        }
        prompt.push(actionDesc + '.');

        ca.dialogueLines.forEach(line => {
          if (line.sentence) {
            prompt.push(`${character.name} ${line.type === 'Ask a question' ? 'bertanya' : 'menjawab'}: "${line.sentence}"`);
          }
        });
      }
    });

    // Location
    if (location) {
      prompt.push(`Adegan berlangsung di ${location.toLowerCase()}.`);
    }

    // Time of Day
    if (timeOfDay) {
      prompt.push(`Waktu kejadian adalah ${timeOfDay.toLowerCase()}.`);
    }

    // Camera Motion
    if (cameraMotion) {
      const motion = dropdownData.cameraMotion.find(m => m.en === cameraMotion);
      if (motion) {
        prompt.push(`Gerakan kamera: ${motion.id}.`);
      }
    }

    // Lighting
    if (lighting) {
      prompt.push(`Pencahayaan: ${lighting.toLowerCase()}.`);
    }

    // Visual/Video Style
    if (selectedVisualStyles.length > 0) {
      prompt.push(`Gaya visual video adalah ${selectedVisualStyles.map(s => s.toLowerCase()).join(', ')}.`);
    }

    // Video Mood / Atmosphere
    if (videoMood) {
      prompt.push(`Suasana video: ${videoMood.toLowerCase()}.`);
    }

    // Sound / Music
    if (soundMusic) {
      prompt.push(`Latar belakang musik/suara: ${soundMusic.toLowerCase()}.`);
    }

    // Spoken Dialogue (global, if any)
    spokenDialogue.forEach(sd => {
      const speaker = savedCharacters.find(sc => sc.id === sd.charId);
      if (speaker && sd.sentence) {
        let dialogueText = `${speaker.name} `;
        if (sd.type === 'Ask a question') {
            dialogueText += `bertanya`;
            const targetChar = savedCharacters.find(char => char.id === sd.targetCharId);
            if (targetChar) dialogueText += ` kepada ${targetChar.name}`;
            dialogueText += `: "${sd.sentence}"`;
        } else if (sd.type === 'Give an answer') {
            dialogueText += `menjawab`;
            const targetChar = savedCharacters.find(char => char.id === sd.targetCharId);
            if (targetChar) dialogueText += ` kepada ${targetChar.name}`;
            dialogueText += `: "${sd.sentence}"`;
        } else if (sd.type === 'Berbicara ke Audiens') {
            dialogueText += `berbicara kepada audiens: "${sd.sentence}"`;
        }
        prompt.push(dialogueText);
      }
    });

    // Additional Details
    if (additionalDetails) {
      prompt.push(`Detail tambahan: ${additionalDetails}.`);
    }

    setIndonesianPrompt(prompt.join(' '));
  };

  const maximizeEnglishPrompt = async () => {
    if (!indonesianPrompt) {
      showCustomModal("Generate the Indonesian prompt first.");
      return;
    }

    setIsLoadingPrompt(true);
    try {
      const promptText = `Optimize the following Indonesian animation prompt for Google Veo 3. Ensure the output is clean, polished, detailed, and follows a Veo-style structure. Keep any direct dialogue sentences in their original Indonesian.

      Indonesian Prompt:
      ${indonesianPrompt}

      Veo 3 Optimized English Prompt:`;

      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: promptText }] });
      const payload = { contents: chatHistory };
      // Gunakan geminiApiKey yang sudah disesuaikan
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error (maximizeEnglishPrompt):", response.status, errorText);
        showCustomModal(`Gagal mengoptimalkan prompt. Status: ${response.status}. Detail: ${errorText.substring(0, 100)}...`);
        return;
      }

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setEnglishPrompt(text);
      } else {
        showCustomModal("Failed to generate English prompt. Unexpected API response.");
        console.error("API response error:", result);
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      showCustomModal("Error optimizing prompt. Please try again.");
    } finally {
      setIsLoadingPrompt(false);
    }
  };

  // Copy to clipboard function
  const copyToClipboard = (text) => {
    if (!text) {
      showCustomModal("Nothing to copy!");
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      showCustomModal('Prompt copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      showCustomModal('Failed to copy prompt. Please try manually.');
    }
    document.body.removeChild(textarea);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans text-gray-800">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        body {
          font-family: 'Inter', sans-serif;
        }
      `}</style>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-blue-700 mb-2 uppercase">
          VEO 3 ANIMATION PROMPTER
        </h1>
        <p className="text-xl font-bold italic text-center text-gray-600 mb-8">[BY ANAK BOJONEGORO]</p>

        {/* Character Name */}
        <SectionWrapper title="1. Character Name" defaultOpen={true}>
          <label htmlFor="characterName" className="block text-gray-700 text-sm font-bold mb-2">
            Character Name (optional)
          </label>
          <input
            type="text"
            id="characterName"
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            value={characterName}
            onChange={(e) => setCharacterName(e.target.value)}
            placeholder="e.g., Kucing Ajaib, Pahlawan Super"
          />
        </SectionWrapper>

        {/* Character Description */}
        <SectionWrapper title="2. Character Description" defaultOpen={true}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Character Type
            </label>
            <select
              className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              value={characterType}
              onChange={(e) => setCharacterType(e.target.value)}
            >
              <option value="">Select Character Type</option>
              <option value="human">Human</option>
              <option value="animal4">Animals (normal four-legged walking)</option>
              <option value="animal2">Animals (realistic body/posture but walks on two legs)</option>
              <option value="fantasy">Fantasy Creature</option>
            </select>
          </div>

          {characterType === 'human' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Gender</label>
                <select
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={humanDetails.gender || ''}
                  onChange={(e) => setHumanDetails({ ...humanDetails, gender: e.target.value })}
                >
                  <option value="">Select Gender</option>
                  {dropdownData.gender.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Face Shape</label>
                <select
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={humanDetails.faceShape || ''}
                  onChange={(e) => setHumanDetails({ ...humanDetails, faceShape: e.target.value })}
                >
                  <option value="">Select Face Shape</option>
                  {dropdownData.faceShape.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Skin Color</label>
                <select
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={humanDetails.skinColor || ''}
                  onChange={(e) => setHumanDetails({ ...humanDetails, skinColor: e.target.value })}
                >
                  <option value="">Select Skin Color</option>
                  {dropdownData.skinColor.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Body Type/Posture</label>
                <select
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={humanDetails.bodyTypePosture || ''}
                  onChange={(e) => setHumanDetails({ ...humanDetails, bodyTypePosture: e.target.value })}
                >
                  <option value="">Select Body Type/Posture</option>
                  {dropdownData.bodyTypePosture.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Age (optional)</label>
                <input
                  type="text"
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={humanDetails.age || ''}
                  onChange={(e) => setHumanDetails({ ...humanDetails, age: e.target.value })}
                  placeholder="e.g., 22 tahun"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Height (optional)</label>
                <input
                  type="text"
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={humanDetails.height || ''}
                  onChange={(e) => setHumanDetails({ ...humanDetails, height: e.target.value })}
                  placeholder="e.g., 170cm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm font-bold mb-2">Clothing/Accessories (optional)</label>
                <input
                  type="text"
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={humanDetails.clothingAccessories || ''}
                  onChange={(e) => setHumanDetails({ ...humanDetails, clothingAccessories: e.target.value })}
                  placeholder="e.g., blue t-shirt, glasses"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm font-bold mb-2">Additional Detail (optional)</label>
                <textarea
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={humanDetails.additionalDetail || ''}
                  onChange={(e) => setHumanDetails({ ...humanDetails, additionalDetail: e.target.value })}
                  placeholder="e.g., has a scar on left cheek"
                  rows="2"
                ></textarea>
              </div>
            </div>
          )}

          {characterType === 'animal4' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Animal Type (optional)</label>
                <input
                  type="text"
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={animal4Details.animalType || ''}
                  onChange={(e) => setAnimal4Details({ ...animal4Details, animalType: e.target.value })}
                  placeholder="e.g., Golden Retriever"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Clothing/Accessories (optional)</label>
                <input
                  type="text"
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={animal4Details.clothingAccessories || ''}
                  onChange={(e) => setAnimal4Details({ ...animal4Details, clothingAccessories: e.target.value })}
                  placeholder="e.g., small red collar"
                />
              </div>
            </div>
          )}

          {characterType === 'animal2' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Animal Type</label>
                <input
                  type="text"
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={animal2Details.animalType || ''}
                  onChange={(e) => setAnimal2Details({ ...animal2Details, animalType: e.target.value })}
                  placeholder="e.g., Bear"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Gender</label> {/* New Gender field for animal2 */}
                <select
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={animal2Details.gender || ''}
                  onChange={(e) => setAnimal2Details({ ...animal2Details, gender: e.target.value })}
                >
                  <option value="">Select Gender</option>
                  {dropdownData.gender.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Usia Karakter</label>
                <select
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={animal2Details.age || ''}
                  onChange={(e) => setAnimal2Details({ ...animal2Details, age: e.target.value })}
                  required
                >
                  <option value="">Select Usia Karakter</option>
                  {dropdownData.animalAge.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Body Shape/Posture</label>
                <select
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={animal2Details.bodyShapePosture || ''}
                  onChange={(e) => setAnimal2Details({ ...animal2Details, bodyShapePosture: e.target.value })}
                  required
                >
                  <option value="">Select Body Shape/Posture</option>
                  {dropdownData.animalBodyShape.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Nose Shape (optional)</label>
                <input
                  type="text"
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={animal2Details.noseShape || ''}
                  onChange={(e) => setAnimal2Details({ ...animal2Details, noseShape: e.target.value })}
                  placeholder="e.g., button nose"
                />
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Face Feature</label>
                <select
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={animal2Details.faceFeature || ''}
                  onChange={(e) => setAnimal2Details({ ...animal2Details, faceFeature: e.target.value })}
                  required
                >
                  <option value="">Select Face Feature</option>
                  {dropdownData.faceFeature.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Ear Feature</label>
                <select
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={animal2Details.earFeature || ''}
                  onChange={(e) => setAnimal2Details({ ...animal2Details, earFeature: e.target.value })}
                  required
                >
                  <option value="">Select Ear Feature</option>
                  {dropdownData.earFeature.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Fur Characteristic</label>
                <select
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={animal2Details.furCharacteristic || ''}
                  onChange={(e) => setAnimal2Details({ ...animal2Details, furCharacteristic: e.target.value })}
                  required
                >
                  <option value="">Select Fur Characteristic</option>
                  {dropdownData.furCharacteristic.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-gray-700 text-sm font-bold mb-2">Fur Colors (main + secondary)</label>
                <input
                  type="text"
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={animal2Details.furColors || ''}
                  onChange={(e) => setAnimal2Details({ ...animal2Details, furColors: e.target.value })}
                  placeholder="e.g., brown and white"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700 text-sm font-bold mb-2">Clothing/Accessories (optional)</label>
                <input
                  type="text"
                  className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={animal2Details.clothingAccessories || ''}
                  onChange={(e) => setAnimal2Details({ ...animal2Details, clothingAccessories: e.target.value })}
                  placeholder="e.g., small hat"
                />
              </div>
            </div>
          )}

          {characterType === 'fantasy' && (
            <div className="mt-4">
              <label className="block text-gray-700 text-sm font-bold mb-2">Manual Description Input (optional)</label>
              <textarea
                className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                value={fantasyDetails}
                onChange={(e) => setFantasyDetails(e.target.value)}
                placeholder="e.g., A dragon with shimmering scales and four wings."
                rows="3"
              ></textarea>
            </div>
          )}

          <button
            onClick={handleSaveCharacter}
            className="mt-6 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
          >
            Save Character
          </button>

          {savedCharacters.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Saved Characters:</h3>
              <ul className="list-disc list-inside space-y-1">
                {savedCharacters.map(char => (
                  <li key={char.id} className="text-gray-700">
                    {char.name} ({char.type})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SectionWrapper>

        {/* Character Actions */}
        <SectionWrapper title="3. Character Actions" defaultOpen={true}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Select Characters for Actions
            </label>
            <div className="flex flex-wrap gap-4">
              {savedCharacters.length === 0 ? (
                <p className="text-gray-600">No characters saved yet. Please save characters in the section above.</p>
              ) : (
                savedCharacters.map(char => (
                  <label key={char.id} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      className="form-checkbox text-blue-600 h-5 w-5"
                      checked={selectedCharactersForActions.includes(char.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCharactersForActions([...selectedCharactersForActions, char.id]);
                        } else {
                          setSelectedCharactersForActions(selectedCharactersForActions.filter(id => id !== char.id));
                          // Remove actions and dialogue for deselected character
                          setCharacterActions(prevActions => prevActions.filter(action => action.charId !== char.id));
                        }
                      }}
                    />
                    <span className="ml-2 text-gray-700">{char.name}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {selectedCharactersForActions.length > 0 && (
            <div className="mt-6 space-y-6">
              {selectedCharactersForActions.map(charId => {
                const character = savedCharacters.find(sc => sc.id === charId);
                const currentAction = characterActions.find(ca => ca.charId === charId) || { action: '', isMain: false, dialogueLines: [] };

                if (!character) return null;

                return (
                  <div key={charId} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                    <h4 className="text-md font-semibold mb-3 text-gray-800">
                      Actions for {character.name}
                    </h4>
                    <div className="mb-3 flex items-end gap-2">
                      <div className="flex-grow">
                        <label htmlFor={`action-${charId}`} className="block text-gray-700 text-sm font-bold mb-2">
                          Individual Action
                        </label>
                        <input
                          type="text"
                          id={`action-${charId}`}
                          className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                          value={currentAction.action}
                          onChange={(e) => handleCharacterActionChange(charId, 'action', e.target.value)}
                          placeholder={`e.g., berlari, terbang, berbicara`}
                        />
                      </div>
                      <button
                        onClick={() => suggestCharacterAction(charId)}
                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors shadow-md flex items-center justify-center h-10"
                        disabled={isLoadingActionSuggestion[charId]}
                      >
                        {isLoadingActionSuggestion[charId] ? (
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : '✨'} Sarankan Aksi
                      </button>
                    </div>
                    <div className="mb-4">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          className="form-checkbox text-blue-600 h-5 w-5"
                          checked={currentAction.isMain}
                          onChange={() => handleToggleMainCharacter(charId)}
                        />
                        <span className="ml-2 text-gray-700">Main Character</span>
                      </label>
                    </div>

                    {/* Dialogue Lines for this character */}
                    <div className="mb-3">
                      <h5 className="text-sm font-semibold mb-2 text-gray-700">Dialogue Lines for {character.name}:</h5>
                      {currentAction.dialogueLines.map((line, lineIndex) => (
                        <div key={lineIndex} className="flex items-center space-x-2 mb-2">
                          <select
                            className="shadow border rounded-lg py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 w-1/3 bg-gray-50"
                            value={line.type}
                            onChange={(e) => handleDialogueLineChange(charId, lineIndex, 'type', e.target.value)}
                          >
                            <option value="">Select Type</option>
                            <option value="Ask a question">Ask a question</option>
                            <option value="Give an answer">Give an answer</option>
                            <option value="Berbicara ke Audiens">Berbicara ke Audiens</option>
                          </select>
                          {(line.type === 'Ask a question' || line.type === 'Give an answer') && (
                            <select
                              className="shadow border rounded-lg py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 w-1/3 bg-gray-50"
                              value={line.targetCharId || ''}
                              onChange={(e) => handleDialogueLineChange(charId, lineIndex, 'targetCharId', e.target.value)}
                            >
                              <option value="">To whom?</option>
                              {savedCharacters.filter(c => c.id !== charId).map(c => ( // Exclude self
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </select>
                          )}
                          <input
                            type="text"
                            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow bg-gray-50"
                            value={line.sentence}
                            onChange={(e) => handleDialogueLineChange(charId, lineIndex, 'sentence', e.target.value)}
                            placeholder="Enter dialogue sentence"
                          />
                          <button
                            onClick={() => handleRemoveDialogueLine(charId, lineIndex)}
                            className="bg-red-500 text-white p-2 rounded-md hover:bg-red-600 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => handleAddDialogueLine(charId)}
                        className="mt-2 bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors text-sm"
                      >
                        Add Dialogue Line
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionWrapper>

        {/* Expression */}
        <SectionWrapper title="4. Expression (optional)" defaultOpen={true}>
          {savedCharacters.length === 0 ? (
            <p className="text-gray-600">No characters saved yet to set expressions for.</p>
          ) : (
            savedCharacters.map(char => (
              <div key={`exp-${char.id}`} className="mb-4">
                <label htmlFor={`expression-${char.id}`} className="block text-gray-700 text-sm font-bold mb-2">
                  {char.name}'s Expression
                </label>
                <select
                  id={`expression-${char.id}`}
                  className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                  value={expressions[char.id] || ''}
                  onChange={(e) => setExpressions({ ...expressions, [char.id]: e.target.value })}
                >
                  <option value="">Select Expression</option>
                  {dropdownData.expression.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            ))
          )}
        </SectionWrapper>

        {/* Location */}
        <SectionWrapper title="5. Location" defaultOpen={true}>
          <label htmlFor="location" className="block text-gray-700 text-sm font-bold mb-2">
            Location
          </label>
          <input
            type="text"
            id="location"
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., di hutan lebat, di kota futuristik, di dalam gua"
          />
        </SectionWrapper>

        {/* Time of Day */}
        <SectionWrapper title="6. Time of Day" defaultOpen={true}>
          <label htmlFor="timeOfDay" className="block text-gray-700 text-sm font-bold mb-2">
            Time of Day
          </label>
          <select
            id="timeOfDay"
            className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(e.target.value)}
          >
            <option value="">Select Time of Day</option>
            {dropdownData.timeOfDay.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </SectionWrapper>

        {/* Camera Motion */}
        <SectionWrapper title="7. Camera Motion" defaultOpen={true}>
          <label htmlFor="cameraMotion" className="block text-gray-700 text-sm font-bold mb-2">
            Camera Motion
          </label>
          <select
            id="cameraMotion"
            className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            value={cameraMotion}
            onChange={(e) => setCameraMotion(e.target.value)}
          >
            <option value="">Select Camera Motion</option>
            {dropdownData.cameraMotion.map(option => (
              <option key={option.en} value={option.en}>
                {option.en} ({option.id})
              </option>
            ))}
          </select>
        </SectionWrapper>

        {/* Lighting */}
        <SectionWrapper title="8. Lighting" defaultOpen={true}>
          <label htmlFor="lighting" className="block text-gray-700 text-sm font-bold mb-2">
            Lighting
          </label>
          <select
            id="lighting"
            className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            value={lighting}
            onChange={(e) => setLighting(e.target.value)}
          >
            <option value="">Select Lighting</option>
            {dropdownData.lighting.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </SectionWrapper>

        {/* Visual/Video Style */}
        <SectionWrapper title="9. Visual/Video Style" defaultOpen={true}>
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">By Visual Technique</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {visualStyles.visualTechnique.map(style => (
                <label key={style} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox text-blue-600 h-5 w-5 rounded"
                    checked={selectedVisualStyles.includes(style)}
                    onChange={() => handleVisualStyleChange(style)}
                  />
                  <span className="ml-2 text-gray-700">{style}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">By Artistic Style</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {visualStyles.artisticStyle.map(style => (
                <label key={style} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox text-blue-600 h-5 w-5 rounded"
                    checked={selectedVisualStyles.includes(style)}
                    onChange={() => handleVisualStyleChange(style)}
                  />
                  <span className="ml-2 text-gray-700">{style}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-2">By Studio/Brand Style</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {visualStyles.studioBrandStyle.map(style => (
                <label key={style} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    className="form-checkbox text-blue-600 h-5 w-5 rounded"
                    checked={selectedVisualStyles.includes(style)}
                    onChange={() => handleVisualStyleChange(style)}
                  />
                  <span className="ml-2 text-gray-700">{style}</span>
                </label>
              ))}
            </div>
          </div>
        </SectionWrapper>

        {/* Video Mood / Atmosphere */}
        <SectionWrapper title="10. Video Mood / Atmosphere" defaultOpen={true}>
          <label htmlFor="videoMood" className="block text-gray-700 text-sm font-bold mb-2">
            Video Mood / Atmosphere
          </label>
          <select
            id="videoMood"
            className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            value={videoMood}
            onChange={(e) => setVideoMood(e.target.value)}
          >
            <option value="">Select Mood</option>
            {dropdownData.videoMood.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </SectionWrapper>

        {/* Sound / Music */}
        <SectionWrapper title="11. Sound / Music (optional)" defaultOpen={true}>
          <label htmlFor="soundMusic" className="block text-gray-700 text-sm font-bold mb-2">
            Background Music or Sound Effects
          </label>
          <input
            type="text"
            id="soundMusic"
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            value={soundMusic}
            onChange={(e) => setSoundMusic(e.target.value)}
            placeholder="e.g., cheerful piano music, sound of rain"
          />
        </SectionWrapper>

        {/* Spoken Dialogue */}
        <SectionWrapper title="12. Spoken Dialogue" defaultOpen={true}>
          {savedCharacters.length === 0 ? (
            <p className="text-gray-600">No characters saved yet to add dialogue for.</p>
          ) : (
            <>
              {spokenDialogue.map((dialogue, index) => (
                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <label className="block text-gray-700 text-sm font-bold w-1/4">Speaker:</label>
                    <select
                      className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow bg-gray-50"
                      value={dialogue.charId}
                      onChange={(e) => handleSpokenDialogueChange(index, 'charId', e.target.value)}
                    >
                      <option value="">Select Character</option>
                      {savedCharacters.map(char => (
                        <option key={char.id} value={char.id}>{char.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center space-x-2 mb-2">
                    <label className="block text-gray-700 text-sm font-bold w-1/4">Type:</label>
                    <select
                      className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow bg-gray-50"
                      value={dialogue.type}
                      onChange={(e) => handleSpokenDialogueChange(index, 'type', e.target.value)}
                    >
                      <option value="">Select Type</option>
                      <option value="Ask a question">Ask a question</option>
                      <option value="Give an answer">Give an answer</option>
                      <option value="Berbicara ke Audiens">Berbicara ke Audiens</option>
                    </select>
                  </div>
                  {(dialogue.type === 'Ask a question' || dialogue.type === 'Give an answer') && (
                    <div className="flex items-center space-x-2 mb-2">
                      <label className="block text-gray-700 text-sm font-bold w-1/4">To:</label>
                      <select
                        className="shadow border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow bg-gray-50"
                        value={dialogue.targetCharId || ''}
                        onChange={(e) => handleSpokenDialogueChange(index, 'targetCharId', e.target.value)}
                      >
                        <option value="">Select Target Character</option>
                        {savedCharacters.filter(c => c.id !== dialogue.charId).map(c => ( // Exclude self
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex items-end space-x-2 mb-2">
                    <div className="flex-grow">
                      <label className="block text-gray-700 text-sm font-bold w-1/4">Sentence:</label>
                      <input
                        type="text"
                        className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow bg-gray-50"
                        value={dialogue.sentence}
                        onChange={(e) => handleSpokenDialogueChange(index, 'sentence', e.target.value)}
                        placeholder="Enter dialogue sentence"
                      />
                    </div>
                    <button
                      onClick={() => suggestDialogueSentence(index)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors shadow-md flex items-center justify-center h-10"
                      disabled={isLoadingDialogueSuggestion[index]}
                    >
                      {isLoadingDialogueSuggestion[index] ? (
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : '✨'} Sarankan Kalimat
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemoveSpokenDialogue(index)}
                    className="mt-2 bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors text-sm"
                  >
                    Remove Dialogue
                  </button>
                </div>
              ))}
              <button
                onClick={handleAddSpokenDialogue}
                className="mt-4 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
              >
                Add Spoken Dialogue
              </button>
            </>
          )}
        </SectionWrapper>

        {/* Additional Details */}
        <SectionWrapper title="13. Additional Details (optional)" defaultOpen={true}>
          <label htmlFor="additionalDetails" className="block text-gray-700 text-sm font-bold mb-2">
            Other Notes
          </label>
          <textarea
            id="additionalDetails"
            className="shadow appearance-none border rounded-lg w-full py-2 px-3 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            value={additionalDetails}
            onChange={(e) => setAdditionalDetails(e.target.value)}
            placeholder="e.g., The video should have a fast pace. Ensure smooth transitions."
            rows="3"
          ></textarea>
        </SectionWrapper>

        {/* Generate Prompt Button */}
        <div className="text-center my-8">
          <button
            onClick={generateIndonesianPromptText}
            className="bg-purple-600 text-white px-8 py-4 rounded-lg font-bold text-xl hover:bg-purple-700 transition-colors shadow-lg"
          >
            Generate Indonesian Prompt
          </button>
        </div>

        {/* Output Section */}
        <SectionWrapper title="Output Prompts" defaultOpen={true}>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Generated Prompts</h2>

          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-2">Editable Prompt in Bahasa Indonesia</h3>
            <textarea
              className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-900 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
              rows="8"
              value={indonesianPrompt}
              onChange={(e) => setIndonesianPrompt(e.target.value)}
              placeholder="Your generated Indonesian prompt will appear here. You can edit it."
            ></textarea>
            <button
              onClick={() => copyToClipboard(indonesianPrompt)}
              className="mt-2 bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors text-sm"
            >
              Copy Indonesian Prompt
            </button>
          </div>

          <div className="text-center my-6">
            <button
              onClick={maximizeEnglishPrompt}
              className="bg-orange-600 text-white px-8 py-4 rounded-lg font-bold text-xl hover:bg-orange-700 transition-colors shadow-lg flex items-center justify-center mx-auto"
              disabled={isLoadingPrompt}
            >
              {isLoadingPrompt && (
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isLoadingPrompt ? 'Optimizing...' : '✨ MAKSIMALKAN'}
            </button>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-2">FINAL ENGLISH PROMPT (optimized for Veo 3)</h3>
            <textarea
              className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-900 leading-tight bg-gray-100 cursor-not-allowed"
              rows="10"
              value={englishPrompt}
              readOnly
              placeholder="Your optimized English prompt will appear here."
            ></textarea>
            <button
              onClick={() => copyToClipboard(englishPrompt)}
              className="mt-2 bg-gray-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-gray-600 transition-colors text-sm"
            >
              Copy English Prompt
            </button>
          </div>
        </SectionWrapper>
      </div>

      {/* Custom Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
            <p className="text-gray-800 text-lg mb-4">{modalMessage}</p>
            <button
              onClick={() => setShowModal(false)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
