import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, query, where, getDocs } from 'firebase/firestore';

// FirebaseContext: Dùng để chia sẻ các đối tượng Firebase (db, auth, userId) và các hàm điều hướng
// giữa các component con mà không cần truyền prop thủ công qua nhiều cấp.
const FirebaseContext = createContext(null);

// App Component: Component chính của ứng dụng, quản lý trạng thái toàn cục và điều hướng.
function App() {
  const [db, setDb] = useState(null); // Đối tượng Firestore database
  const [auth, setAuth] = useState(null); // Đối tượng Firebase Authentication
  const [userId, setUserId] = useState(null); // ID của người dùng hiện tại
  const [currentPage, setCurrentPage] = useState('courses'); // Quản lý trang hiện tại: 'courses', 'topics', 'flashcards', 'gameMode'
  const [selectedCourse, setSelectedCourse] = useState(null); // Khóa học được chọn
  const [selectedTopic, setSelectedTopic] = useState(null); // Chủ đề được chọn
  const [showDataLoader, setShowDataLoader] = useState(true); // Trạng thái kiểm soát hiển thị InitialDataLoader

  // useEffect để khởi tạo Firebase và xử lý đăng nhập người dùng.
  // Chỉ chạy một lần khi component được mount (nhờ dependency array rỗng []).
  useEffect(() => {
    // Lấy appId và firebaseConfig từ biến global được cung cấp bởi môi trường Canvas.
    // Cung cấp giá trị mặc định để ứng dụng vẫn có thể chạy (với cảnh báo) nếu các biến này không tồn tại.
    const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
    const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

    // Kiểm tra xem cấu hình Firebase có hợp lệ không.
    if (Object.keys(firebaseConfig).length > 0) {
      // Khởi tạo ứng dụng Firebase.
      const app = initializeApp(firebaseConfig);
      // Lấy các dịch vụ Firestore và Authentication.
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);

      // Cập nhật state với các đối tượng Firebase đã khởi tạo.
      setDb(firestoreDb);
      setAuth(firebaseAuth);

      // Đăng ký lắng nghe sự thay đổi trạng thái xác thực.
      const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
        if (user) {
          // Nếu người dùng đã đăng nhập (hoặc đăng nhập thành công), cập nhật userId.
          setUserId(user.uid);
        } else {
          try {
            // Nếu không có người dùng, thử đăng nhập bằng custom token (nếu có) hoặc ẩn danh.
            if (typeof __initial_auth_token !== 'undefined') {
              await signInWithCustomToken(firebaseAuth, __initial_auth_token);
            } else {
              await signInAnonymously(firebaseAuth);
            }
          } catch (error) {
            // Xử lý lỗi nếu quá trình đăng nhập thất bại.
            console.error("Lỗi khi đăng nhập Firebase:", error);
            // Fallback: Tạo một ID ngẫu nhiên nếu xác thực thất bại để ứng dụng vẫn hoạt động.
            setUserId(crypto.randomUUID());
          }
        }
      });

      // Hàm cleanup: Hủy đăng ký lắng nghe khi component unmount.
      return () => unsubscribe();
    } else {
      // Cảnh báo nếu cấu hình Firebase không có sẵn.
      console.warn("Cấu hình Firebase không khả dụng. Ứng dụng sẽ chạy ở chế độ offline.");
      // Tạo ID ngẫu nhiên nếu không có Firebase để ứng dụng vẫn có thể hiển thị.
      setUserId(crypto.randomUUID());
    }
  }, []); // Dependency array rỗng đảm bảo useEffect chỉ chạy một lần.

  // Hiển thị màn hình tải ứng dụng trong khi Firebase đang khởi tạo hoặc xác thực.
  if (!db || !auth || !userId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#ADD8E6] to-[#DDA0DD] animate-pulse">
        <div className="text-2xl font-bold text-[#009ACD] flex items-center">
          <svg className="animate-spin h-8 w-8 mr-3 text-[#00BFFF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Đang tải ứng dụng...
        </div>
      </div>
    );
  }

  return (
    // Cung cấp các đối tượng Firebase và hàm điều hướng cho các component con thông qua Context.
    <FirebaseContext.Provider value={{ db, auth, userId, setCurrentPage, setSelectedCourse, setSelectedTopic }}>
      {/* Container chính của ứng dụng với nền gradient và font Inter */}
      <div className="min-h-screen bg-gradient-to-br from-[#E0F2F7] to-[#F0F8FF] font-inter text-gray-800">
        {/* Header của ứng dụng */}
        <header className="bg-gradient-to-r from-[#00BFFF] to-[#009ACD] text-white p-4 shadow-xl">
          <div className="container mx-auto flex flex-col sm:flex-row justify-between items-center">
            {/* Tiêu đề ứng dụng */}
            <h1 className="text-4xl font-extrabold rounded-lg p-2 tracking-wide mb-4 sm:mb-0">Flashcard Master</h1>
            {/* Thanh điều hướng */}
            <nav className="space-x-2 sm:space-x-4 flex">
              <button
                onClick={() => { setCurrentPage('courses'); setSelectedCourse(null); setSelectedTopic(null); }}
                className="py-2 px-4 sm:px-6 bg-white text-[#009ACD] rounded-full shadow-md hover:bg-blue-100 transition-all duration-300 ease-in-out font-semibold text-base sm:text-lg transform hover:scale-105"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                Khóa học
              </button>
            </nav>
          </div>
        </header>

        {/* Phần nội dung chính của ứng dụng */}
        <main className="container mx-auto p-4 sm:p-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-3xl">
            {/* Hiển thị InitialDataLoader nếu showDataLoader là true */}
            {showDataLoader && <InitialDataLoader onDataLoaded={() => setShowDataLoader(false)} />}
            
            {/* Chỉ hiển thị các component học nếu InitialDataLoader không hiển thị */}
            {!showDataLoader && (
              <>
                {currentPage === 'courses' && <CourseList />}
                {currentPage === 'topics' && selectedCourse && <TopicList course={selectedCourse} />}
                {currentPage === 'flashcards' && selectedTopic && <FlashcardView topic={selectedTopic} />}
                {currentPage === 'gameMode' && selectedTopic && <GameMode topic={selectedTopic} />} {/* Thêm GameMode */}
              </>
            )}
          </div>
        </main>
      </div>
    </FirebaseContext.Provider>
  );
}

// CourseList Component: Hiển thị danh sách các khóa học.
function CourseList() {
  // Lấy db và các hàm điều hướng từ FirebaseContext.
  const { db, setCurrentPage, setSelectedCourse } = useContext(FirebaseContext);
  const [courses, setCourses] = useState([]); // Danh sách khóa học
  const [loading, setLoading] = useState(true); // Trạng thái tải dữ liệu
  const [error, setError] = useState(null); // Thông báo lỗi

  // useEffect để tải danh sách khóa học từ Firestore.
  // Chạy lại khi đối tượng db thay đổi.
  useEffect(() => {
    if (!db) return; // Đảm bảo db đã được khởi tạo trước khi truy vấn.

    // Tham chiếu đến collection 'courses' trong Firestore.
    // Dữ liệu public được lưu trong đường dẫn: artifacts/{appId}/public/data/{your_collection_name}
    const coursesColRef = collection(db, `artifacts/${__app_id}/public/data/courses`);
    
    // Đăng ký lắng nghe thay đổi dữ liệu theo thời gian thực (onSnapshot).
    const unsubscribe = onSnapshot(coursesColRef,
      (snapshot) => {
        // Ánh xạ dữ liệu từ snapshot thành mảng các đối tượng khóa học.
        const coursesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setCourses(coursesData); // Cập nhật state courses
        setLoading(false); // Đặt trạng thái tải thành false
      },
      (err) => {
        // Xử lý lỗi nếu không thể tải khóa học.
        console.error("Lỗi khi tải khóa học:", err);
        setError("Không thể tải khóa học. Vui lòng thử lại."); // Đặt thông báo lỗi
        setLoading(false); // Đặt trạng thái tải thành false
      }
    );

    // Hàm cleanup: Hủy đăng ký lắng nghe khi component unmount.
    return () => unsubscribe();
  }, [db]); // Dependency array: useEffect chạy lại khi db thay đổi.

  // Hiển thị trạng thái tải, lỗi hoặc không có dữ liệu.
  if (loading) return <div className="text-center text-[#00BFFF] py-8 text-lg font-medium animate-pulse">Đang tải khóa học...</div>;
  if (error) return <div className="text-center text-red-500 py-8 text-lg font-medium">{error}</div>;
  if (courses.length === 0) return <div className="text-center text-gray-500 py-8 text-lg font-medium">Chưa có khóa học nào để hiển thị.</div>;

  return (
    <div>
      <h2 className="text-3xl sm:text-4xl font-extrabold mb-8 text-center text-[#008BBE]">Các Khóa Học Hiện Có</h2>
      <div className="flex flex-col gap-4">
        {courses.map(course => (
          <div
            key={course.id}
            className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ease-in-out cursor-pointer border border-[#ADD8E6] transform hover:-translate-y-1 flex items-center justify-between"
            onClick={() => {
              setSelectedCourse(course); // Đặt khóa học được chọn
              setCurrentPage('topics'); // Chuyển sang trang chủ đề
            }}
          >
            <h3 className="text-xl font-bold text-[#009ACD]">{course.name}</h3>
            {/* Icon mũi tên chỉ sang phải */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#00BFFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

// TopicList Component: Hiển thị danh sách các chủ đề trong một khóa học cụ thể.
function TopicList({ course }) {
  // Lấy db và các hàm điều hướng từ FirebaseContext.
  const { db, setCurrentPage, setSelectedTopic } = useContext(FirebaseContext);
  const [topics, setTopics] = useState([]); // Danh sách chủ đề
  const [loading, setLoading] = useState(true); // Trạng thái tải dữ liệu
  const [error, setError] = useState(null); // Thông báo lỗi

  // useEffect để tải danh sách chủ đề dựa trên courseId.
  // Chạy lại khi db hoặc course thay đổi.
  useEffect(() => {
    if (!db || !course?.id) return; // Đảm bảo db và courseId đã có.

    // Tham chiếu đến collection 'topics'.
    const topicsColRef = collection(db, `artifacts/${__app_id}/public/data/topics`);
    // Tạo truy vấn để lấy các chủ đề có courseId trùng với course.id hiện tại.
    const q = query(topicsColRef, where("courseId", "==", course.id));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        // Ánh xạ dữ liệu từ snapshot thành mảng các đối tượng chủ đề.
        const topicsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTopics(topicsData); // Cập nhật state topics
        setLoading(false); // Đặt trạng thái tải thành false
      },
      (err) => {
        // Xử lý lỗi nếu không thể tải chủ đề.
        console.error("Lỗi khi tải chủ đề:", err);
        setError("Không thể tải chủ đề. Vui lòng thử lại."); // Đặt thông báo lỗi
        setLoading(false); // Đặt trạng thái tải thành false
      }
    );

    // Hàm cleanup: Hủy đăng ký lắng nghe khi component unmount.
    return () => unsubscribe();
  }, [db, course]); // Dependency array: useEffect chạy lại khi db hoặc course thay đổi.

  // Hiển thị trạng thái tải, lỗi hoặc không có dữ liệu.
  if (loading) return <div className="text-center text-[#00BFFF] py-8 text-lg font-medium animate-pulse">Đang tải chủ đề...</div>;
  if (error) return <div className="text-center text-red-500 py-8 text-lg font-medium">{error}</div>;
  if (topics.length === 0) return <div className="text-center text-gray-500 py-8 text-lg font-medium">Chưa có chủ đề nào trong khóa học này.</div>;

  return (
    <div className="relative pt-16">
      {/* Nút Quay lại Khóa học ở góc trên bên trái */}
      <button
        onClick={() => setCurrentPage('courses')}
        className="absolute top-4 left-4 py-2 px-4 bg-[#00BFFF] text-white rounded-full shadow-lg hover:bg-[#009ACD] transition-all duration-300 ease-in-out flex items-center font-semibold text-base z-10 transform hover:scale-105"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Quay lại
      </button>

      {/* Tiêu đề danh sách chủ đề */}
      <h2 className="text-3xl sm:text-4xl font-extrabold mb-8 text-center text-[#008BBE] mt-0">Chủ Đề trong Khóa Học: <span className="text-gray-900">{course.name}</span></h2>
      <div className="flex flex-col gap-4">
        {topics.map(topic => (
          <div
            key={topic.id}
            className="bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 ease-in-out cursor-pointer border border-[#ADD8E6] transform hover:-translate-y-1 flex items-center justify-between"
            onClick={() => {
              setSelectedTopic(topic); // Đặt chủ đề được chọn
              setCurrentPage('flashcards'); // Chuyển sang trang flashcard
            }}
          >
            <h3 className="text-xl font-bold text-[#009ACD]">{topic.name}</h3>
            {/* Icon mũi tên chỉ sang phải */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#00BFFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
}

// renderMarkdown: Hàm trợ giúp để chuyển đổi Markdown cơ bản thành HTML.
// Hỗ trợ **in đậm**, *in nghiêng*, __gạch chân__ và xuống dòng.
const renderMarkdown = (markdownText) => {
  if (!markdownText) return { __html: '' };

  let html = markdownText;
  // Thay thế **text** bằng <strong>text</strong>
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Thay thế *text* bằng <em>text</em>
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Thay thế __text__ bằng <u>text</u>
  html = html.replace(/__(.*?)__/g, '<u>$1</u>');
  // Thay thế các ký tự xuống dòng bằng thẻ <br />
  html = html.replace(/\n/g, '<br />');

  return { __html: html };
};

// FlashcardView Component: Hiển thị và quản lý các flashcard trong một chủ đề.
function FlashcardView({ topic }) {
  // Lấy db và hàm điều hướng từ FirebaseContext.
  const { db, setCurrentPage } = useContext(FirebaseContext);
  const [flashcards, setFlashcards] = useState([]); // Danh sách flashcard
  const [currentCardIndex, setCurrentCardIndex] = useState(0); // Chỉ số của thẻ hiện tại
  const [showBack, setShowBack] = useState(false); // Trạng thái hiển thị mặt sau của thẻ
  const [loading, setLoading] = useState(true); // Trạng thái tải dữ liệu
  const [error, setError] = useState(null); // Thông báo lỗi
  const [explanation, setExplanation] = useState(''); // Giải thích từ LLM
  const [isGeneratingExplanation, setIsGeneratingExplanation] = useState(false); // Trạng thái đang tạo giải thích

  // useEffect để tải flashcard từ Firestore dựa trên topicId.
  // Chạy lại khi db hoặc topic thay đổi.
  useEffect(() => {
    if (!db || !topic?.id) return; // Đảm bảo db và topicId đã có.

    // Tham chiếu đến collection 'flashcards'.
    const flashcardsColRef = collection(db, `artifacts/${__app_id}/public/data/flashcards`);
    // Tạo truy vấn để lấy các flashcard có topicId trùng với topic.id hiện tại.
    const q = query(flashcardsColRef, where("topicId", "==", topic.id));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const flashcardsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFlashcards(flashcardsData); // Cập nhật state flashcards
        setCurrentCardIndex(0); // Reset chỉ số thẻ về 0 khi flashcards thay đổi
        setShowBack(false); // Reset mặt thẻ về mặt trước
        setExplanation(''); // Xóa giải thích khi tải chủ đề mới
        setLoading(false); // Kết thúc trạng thái tải
      },
      (err) => {
        // Xử lý lỗi nếu không thể tải flashcard.
        console.error("Lỗi khi tải flashcard:", err);
        setError("Không thể tải flashcard. Vui lòng thử lại."); // Đặt thông báo lỗi
        setLoading(false); // Kết thúc trạng thái tải
      }
    );

    // Hàm cleanup: Hủy đăng ký lắng nghe khi component unmount.
    return () => unsubscribe();
  }, [db, topic]); // Dependency array: useEffect chạy lại khi db hoặc topic thay đổi.

  // useEffect để đảm bảo thẻ lật về mặt trước và xóa giải thích khi chuyển thẻ.
  useEffect(() => {
    setShowBack(false); // Luôn hiển thị mặt trước khi chuyển thẻ
    setExplanation(''); // Xóa giải thích cũ khi chuyển thẻ mới
  }, [currentCardIndex]); // Chạy lại khi currentCardIndex thay đổi.

  // Xử lý chuyển sang thẻ tiếp theo.
  const handleNextCard = () => {
    setCurrentCardIndex((prevIndex) => (prevIndex + 1) % flashcards.length);
  };

  // Xử lý chuyển về thẻ trước đó.
  const handlePrevCard = () => {
    setCurrentCardIndex((prevIndex) => (prevIndex - 1 + flashcards.length) % flashcards.length);
  };

  // Xử lý tạo giải thích bằng LLM (Gemini API).
  const handleGenerateExplanation = async () => {
    // Đảm bảo có thẻ hiện tại và không đang trong quá trình tạo giải thích.
    if (!currentCard || isGeneratingExplanation) return;

    setIsGeneratingExplanation(true); // Đặt trạng thái đang tạo
    setExplanation(''); // Xóa giải thích cũ để hiển thị loading

    // Prompt cho LLM: Yêu cầu giải thích ngắn gọn (tối đa 100 từ) bằng tiếng Việt,
    // sử dụng định dạng Markdown cho văn bản.
    const prompt = `Giải thích chi tiết và **tóm tắt ngắn gọn** (tối đa 100 từ) từ/cụm từ tiếng Anh sau: "${currentCard.front}". Bao gồm định nghĩa, ví dụ sử dụng, và các thông tin ngữ cảnh liên quan (nếu có). Vui lòng sử dụng định dạng Markdown cho văn bản: **in đậm**, *in nghiêng*, __gạch chân__. Trả lời bằng tiếng Việt.`;
    
    try {
      let chatHistory = [];
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };
      const apiKey = ""; // Canvas sẽ tự động cung cấp API key tại runtime, không cần điền ở đây.
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      // Gửi yêu cầu đến Gemini API.
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      // Kiểm tra cấu trúc phản hồi và lấy nội dung giải thích.
      if (result.candidates && result.candidates.length > 0 &&
          result.candidates[0].content && result.candidates[0].content.parts &&
          result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setExplanation(text); // Cập nhật giải thích
      } else {
        setExplanation('Không thể tạo giải thích. Vui lòng thử lại.');
        console.error("Cấu trúc phản hồi API không mong muốn:", result);
      }
    } catch (err) {
      console.error("Lỗi khi gọi Gemini API:", err);
      setExplanation('Đã xảy ra lỗi khi tạo giải thích.');
    } finally {
      setIsGeneratingExplanation(false); // Kết thúc trạng thái đang tạo
    }
  };

  // Hiển thị trạng thái tải, lỗi hoặc không có dữ liệu.
  if (loading) return <div className="text-center text-[#00BFFF] py-8 text-lg font-medium animate-pulse">Đang tải flashcard...</div>;
  if (error) return <div className="text-center text-red-500 py-8 text-lg font-medium">{error}</div>;
  if (flashcards.length === 0) return <div className="text-center text-gray-500 py-8 text-lg font-medium">Chưa có flashcard nào trong chủ đề này.</div>;

  const currentCard = flashcards[currentCardIndex]; // Lấy thẻ hiện tại

  return (
    <div className="flex flex-col items-center relative pt-16">
      {/* Nút Quay lại Chủ đề ở góc trên bên trái */}
      <button
        onClick={() => setCurrentPage('topics')}
        className="absolute top-4 left-4 py-2 px-4 bg-[#00BFFF] text-white rounded-full shadow-lg hover:bg-[#009ACD] transition-all duration-300 ease-in-out flex items-center font-semibold text-base z-10 transform hover:scale-105"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Quay lại
      </button>

      {/* Tiêu đề trang flashcard */}
      <h2 className="text-3xl sm:text-4xl font-extrabold mb-8 text-center text-[#008BBE] mt-0">Học Flashcard: <span className="text-gray-900">{topic.name}</span></h2>
      
      {/* Hiển thị số thẻ hiện tại / tổng số thẻ */}
      <p className="mb-4 text-gray-600 text-lg font-medium">
        {currentCardIndex + 1}/{flashcards.length}
      </p>

      {/* CSS tùy chỉnh cho hiệu ứng lật thẻ */}
      <style>{`
        .flashcard-container {
          perspective: 1000px; /* Tạo hiệu ứng 3D perspective */
        }
        .flashcard-inner {
          position: relative;
          width: 100%;
          height: 100%;
          text-align: center;
          transition: transform 0.7s ease-in-out, border-color 0.7s ease-in-out; /* Thêm transition cho border-color */
          transform-style: preserve-3d; /* Giữ các phần tử con trong không gian 3D */
          border-radius: 1rem; /* rounded-xl */
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); /* shadow-2xl */
          border: 2px solid #87CEEB; /* Viền thẻ màu xanh nhạt mặc định */
        }
        .flashcard-inner.flipped {
          transform: rotateY(180deg); /* Lật thẻ 180 độ theo trục Y */
          border-color: #CF9FFF; /* Đổi màu viền sang tím khi lật thẻ */
        }
        .flashcard-face {
          position: absolute;
          width: 100%;
          height: 100%;
          -webkit-backface-visibility: hidden; /* Ẩn mặt sau khi không lật (cho Safari) */
          backface-visibility: hidden; /* Ẩn mặt sau khi không lật */
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem; /* p-6 */
          border-radius: 1rem; /* rounded-xl */
          cursor: pointer; /* Biểu tượng con trỏ khi di chuột */
          user-select: none; /* Ngăn chặn việc chọn văn bản */
        }
        .flashcard-front {
          background-color: white; /* Nền mặt trước màu trắng */
        }
        .flashcard-back {
          background-color: white; /* Nền mặt sau màu trắng */
          transform: rotateY(180deg); /* Xoay mặt sau để nó hiển thị khi thẻ lật */
        }
      `}</style>

      {/* Container của Flashcard */}
      <div className="flashcard-container w-full max-w-sm sm:max-w-md h-64 sm:h-80"> {/* Điều chỉnh kích thước thẻ cho responsive */}
        <div
          key={currentCard.id} // Key quan trọng để React biết đây là thẻ mới và kích hoạt lại animation
          className={`flashcard-inner ${showBack ? 'flipped' : ''}`}
          onClick={() => {
            setShowBack(!showBack); // Lật thẻ khi click
          }}
        >
          {/* Mặt trước của thẻ */}
          <div className="flashcard-face flashcard-front flex-col">
            <p className="text-3xl sm:text-4xl font-extrabold text-gray-800 leading-tight"> {/* Điều chỉnh kích thước font cho responsive */}
              {currentCard.front}
            </p>
            {currentCard.type && (
              <span className="text-lg sm:text-xl font-semibold text-[#00BFFF]"> {/* Điều chỉnh kích thước font cho responsive */}
                ({currentCard.type})
              </span>
            )}
          </div>
          {/* Mặt sau của thẻ */}
          <div className="flashcard-face flashcard-back">
            <p className="text-3xl sm:text-4xl font-extrabold text-gray-800 leading-tight"> {/* Điều chỉnh kích thước font cho responsive */}
              {currentCard.back}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 mt-10">
        <div className="flex space-x-4 sm:space-x-6">
          <button
            onClick={handlePrevCard}
            className="py-3 px-6 sm:px-7 bg-gradient-to-r from-[#00BFFF] to-[#009ACD] text-white rounded-full shadow-lg hover:from-[#009ACD] hover:to-[#008BBE] transition-transform transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[#00BFFF] focus:ring-opacity-75 font-semibold text-lg flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={handleNextCard}
            className="py-3 px-6 sm:px-7 bg-gradient-to-r from-[#00BFFF] to-[#009ACD] text-white rounded-full shadow-lg hover:from-[#009ACD] hover:to-[#008BBE] transition-transform transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-[#00BFFF] focus:ring-opacity-75 font-semibold text-lg flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Nút "Giải thích thêm" */}
        <button
          onClick={handleGenerateExplanation}
          disabled={isGeneratingExplanation} // Vô hiệu hóa nút khi đang tạo giải thích
          className={`py-3 px-8 rounded-full text-white font-bold text-lg shadow-lg transition-all duration-300 ease-in-out flex items-center justify-center ${
            isGeneratingExplanation ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#00BFFF] to-[#009ACD] hover:from-[#009ACD] hover:to-[#008BBE] transform hover:scale-105'
          }`}
        >
          {isGeneratingExplanation ? (
            <>
              {/* Spinner khi đang tạo */}
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang tạo...
            </>
          ) : (
            '✨ Giải thích thêm' // Văn bản nút
          )}
        </button>

        {/* Nút "Game Mode" */}
        <button
          onClick={() => setCurrentPage('gameMode')}
          className="py-3 px-8 rounded-full text-white font-bold text-lg shadow-lg transition-all duration-300 ease-in-out flex items-center justify-center bg-gradient-to-r from-[#FFD700] to-[#FFA500] hover:from-[#FFA500] hover:to-[#FF8C00] transform hover:scale-105"
        >
          🎮 Chế độ Game
        </button>
      </div>

      {/* Hiển thị giải thích từ LLM */}
      {explanation && (
        <div className="mt-8 p-6 bg-[#E0F2F7] rounded-xl shadow-md border border-[#ADD8E6] w-full max-w-sm sm:max-w-md text-gray-700 text-base leading-relaxed animate-fade-in">
          <h3 className="font-bold text-lg mb-3 text-[#008BBE]">Giải thích chi tiết:</h3>
          {/* Sử dụng dangerouslySetInnerHTML để render Markdown đã chuyển đổi thành HTML */}
          <p className="whitespace-pre-wrap" dangerouslySetInnerHTML={renderMarkdown(explanation)}></p>
        </div>
      )}
    </div>
  );
}

// Hàm shuffle mảng (Fisher-Yates)
const shuffleArray = (array) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

// GameMode Component: Quản lý logic và hiển thị các mini-game.
function GameMode({ topic }) {
  const { db, setCurrentPage } = useContext(FirebaseContext);
  const [flashcards, setFlashcards] = useState([]); // Tất cả flashcard trong chủ đề
  const [wordsToPlay, setWordsToPlay] = useState([]); // Danh sách từ còn lại để chơi
  const [currentQuestion, setCurrentQuestion] = useState(null); // Câu hỏi hiện tại
  const [currentGameType, setCurrentGameType] = useState(null); // Loại game hiện tại
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 phút = 1800 giây
  const [gameStarted, setGameStarted] = useState(false); // Trạng thái bắt đầu game
  const [gameOver, setGameOver] = useState(false); // Trạng thái kết thúc game
  const [score, setScore] = useState(0); // Điểm số
  const [totalQuestionsAttempted, setTotalQuestionsAttempted] = useState(0); // Tổng số câu hỏi đã làm
  const [totalCorrectAnswers, setTotalCorrectAnswers] = useState(0); // Tổng số câu trả lời đúng
  const [loading, setLoading] = useState(true); // Trạng thái tải dữ liệu
  const [error, setError] = useState(null); // Thông báo lỗi
  const timerRef = useRef(null); // Ref để lưu trữ ID của setInterval

  // useEffect để tải flashcard từ Firestore khi topic thay đổi
  useEffect(() => {
    if (!db || !topic?.id) return;

    const flashcardsColRef = collection(db, `artifacts/${__app_id}/public/data/flashcards`);
    const q = query(flashcardsColRef, where("topicId", "==", topic.id));

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const flashcardsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFlashcards(flashcardsData);
        setLoading(false);
        // Reset game state khi flashcards thay đổi (chủ đề mới)
        setGameStarted(false);
        setGameOver(false);
        setScore(0);
        setTotalQuestionsAttempted(0);
        setTotalCorrectAnswers(0);
        setTimeLeft(30 * 60);
        setWordsToPlay([]); // Sẽ được khởi tạo khi bắt đầu game
        setCurrentQuestion(null);
        setCurrentGameType(null);
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      },
      (err) => {
        console.error("Lỗi khi tải flashcard cho Game Mode:", err);
        setError("Không thể tải flashcard cho Game Mode. Vui lòng thử lại.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [db, topic]);

  // useEffect để quản lý bộ đếm thời gian
  useEffect(() => {
    if (gameStarted && !gameOver && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => prevTime - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameStarted) {
      setGameOver(true);
      if (timerRef.current) clearInterval(timerRef.current);
    }
    // Cleanup interval khi component unmount hoặc game kết thúc
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameStarted, gameOver, timeLeft]);

  // Hàm chọn loại game dựa trên tỷ lệ 6-2-2
  const selectGameType = () => {
    const rand = Math.random();
    if (rand < 0.6) { // 60% Multiple Choice
      return 'multipleChoice';
    } else if (rand < 0.8) { // 20% Fill in the Blank
      return 'fillInBlank';
    } else { // 20% Matching
      return 'matching';
    }
  };

  // Hàm tạo câu hỏi mới
  const generateNewQuestion = (remainingWords) => {
    if (remainingWords.length === 0) {
      setGameOver(true);
      return null;
    }

    setTotalQuestionsAttempted(prev => prev + 1); // Tăng số câu hỏi đã làm khi tạo câu hỏi mới

    const type = selectGameType();
    setCurrentGameType(type);

    let questionData = {};

    if (type === 'multipleChoice') {
      const currentWord = remainingWords[Math.floor(Math.random() * remainingWords.length)];
      const options = [currentWord.back]; // Đáp án đúng

      // Lấy 3 đáp án sai ngẫu nhiên từ các từ khác
      const otherWords = flashcards.filter(f => f.id !== currentWord.id);
      const shuffledOtherWords = shuffleArray(otherWords);

      for (let i = 0; i < 3; i++) {
        if (shuffledOtherWords[i]) {
          options.push(shuffledOtherWords[i].back);
        } else {
          // Fallback nếu không đủ từ để tạo đáp án sai
          options.push(`Đáp án sai ${i + 1}`);
        }
      }
      questionData = { word: currentWord, options: shuffleArray(options) };
    } else if (type === 'fillInBlank') {
      const currentWord = remainingWords[Math.floor(Math.random() * remainingWords.length)];
      const isEnglishPrompt = Math.random() < 0.5; // 50% tiếng Anh, 50% tiếng Việt
      questionData = { word: currentWord, isEnglishPrompt };
    } else if (type === 'matching') {
      // Đảm bảo có ít nhất 2 từ để tạo cặp nối
      if (remainingWords.length < 2) {
        // Fallback nếu không đủ từ, có thể chuyển sang loại game khác hoặc kết thúc game
        // Nếu chỉ còn 1 từ, không thể chơi matching, chuyển sang Multiple Choice hoặc Fill in the Blank
        const fallbackType = Math.random() < 0.5 ? 'multipleChoice' : 'fillInBlank';
        setCurrentGameType(fallbackType); // Cập nhật loại game
        if (fallbackType === 'multipleChoice') {
            const currentWord = remainingWords[0];
            const options = [currentWord.back];
            const otherWords = flashcards.filter(f => f.id !== currentWord.id);
            const shuffledOtherWords = shuffleArray(otherWords);
            for (let i = 0; i < 3; i++) {
                if (shuffledOtherWords[i]) {
                    options.push(shuffledOtherWords[i].back);
                } else {
                    options.push(`Đáp án sai ${i + 1}`);
                }
            }
            questionData = { word: currentWord, options: shuffleArray(options) };
        } else { // fillInBlank
            const currentWord = remainingWords[0];
            const isEnglishPrompt = Math.random() < 0.5;
            questionData = { word: currentWord, isEnglishPrompt };
        }
        return questionData;
      }
      const wordsForMatching = shuffleArray(remainingWords).slice(0, 2); // Lấy 2 từ ngẫu nhiên
      const englishWords = shuffleArray(wordsForMatching.map(w => w.front));
      const vietnameseWords = shuffleArray(wordsForMatching.map(w => w.back));
      questionData = { words: wordsForMatching, englishWords, vietnameseWords };
    }
    return questionData;
  };

  // Hàm bắt đầu game
  const startGame = () => {
    setWordsToPlay(shuffleArray([...flashcards])); // Khởi tạo danh sách từ để chơi
    setGameStarted(true);
    setGameOver(false);
    setScore(0);
    setTotalQuestionsAttempted(0); // Reset tổng số câu đã làm
    setTotalCorrectAnswers(0); // Reset tổng số câu đúng
    setTimeLeft(30 * 60); // Reset thời gian
    setCurrentQuestion(generateNewQuestion(shuffleArray([...flashcards]))); // Tạo câu hỏi đầu tiên
  };

  // Hàm xử lý khi trả lời đúng
  const handleCorrectAnswer = (answeredWordId) => {
    setTotalCorrectAnswers(prev => prev + 1); // Tăng số câu trả lời đúng
    setScore(prevScore => prevScore + 10); // Tăng điểm khi đúng
    const newWordsToPlay = wordsToPlay.filter(word => word.id !== answeredWordId);
    setWordsToPlay(newWordsToPlay);
    // Nếu là MatchingGame, việc chuyển câu hỏi được xử lý bên trong MatchingGame khi tất cả cặp đã khớp
    // Đối với MultipleChoice và FillInBlank, gọi generateNewQuestion ngay lập tức
    if (currentGameType !== 'matching') {
        setCurrentQuestion(generateNewQuestion(newWordsToPlay));
    }
  };

  // Hàm xử lý khi trả lời sai (đối với Multiple Choice)
  const handleIncorrectAnswer = () => {
    setScore(prevScore => Math.max(0, prevScore - 5)); // Giảm điểm khi sai
    // Từ sai vẫn giữ trong danh sách
    setCurrentQuestion(generateNewQuestion(wordsToPlay)); // Tạo câu hỏi mới từ danh sách hiện tại
  };

  // Hàm xử lý khi trả lời sai (đối với Fill in the Blank, Matching)
  const handleGameSpecificIncorrectAnswer = (nextQuestionData) => {
    setScore(prevScore => Math.max(0, prevScore - 5)); // Giảm điểm khi sai
    // Nếu nextQuestionData không được cung cấp (là null/undefined), tự động tạo câu hỏi mới
    setCurrentQuestion(nextQuestionData || generateNewQuestion(wordsToPlay));
  };

  // Định dạng thời gian hiển thị
  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Hàm đánh giá năng lực
  const evaluatePerformance = (accuracy, timeTakenSeconds) => {
    const totalGameTime = 30 * 60; // 1800 giây
    
    let evaluation = "";
    let accuracyText = "";
    let timeText = "";

    // Đánh giá tỷ lệ chính xác
    if (accuracy >= 90) {
      accuracyText = "Xuất sắc";
    } else if (accuracy >= 70) {
      accuracyText = "Tốt";
    } else {
      accuracyText = "Cần cố gắng";
    }

    // Đánh giá thời gian
    if (timeTakenSeconds <= 600) { // Dưới hoặc bằng 10 phút
      timeText = "Rất nhanh";
    } else if (timeTakenSeconds <= 1200) { // Dưới hoặc bằng 20 phút
      timeText = "Khá nhanh";
    } else {
      timeText = "Chậm";
    }

    // Kết hợp đánh giá
    if (accuracy >= 90 && timeTakenSeconds <= 600) {
      evaluation = "Tuyệt vời! Bạn là một bậc thầy từ vựng.";
    } else if (accuracy >= 80 && timeTakenSeconds <= 1200) {
      evaluation = "Rất tốt! Bạn có kiến thức vững chắc và tốc độ ổn.";
    } else if (accuracy >= 70) {
      evaluation = "Tốt! Bạn đang đi đúng hướng, hãy luyện tập thêm.";
    } else {
      evaluation = "Cần cố gắng thêm. Đừng nản lòng, hãy ôn lại và thử lại nhé!";
    }
    return evaluation;
  };

  // Lấy màu sắc cho các chỉ số
  const getAccuracyColorClass = (accuracy) => {
    if (accuracy >= 90) return 'text-green-600';
    if (accuracy >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTimeColorClass = (timeSeconds) => {
    if (timeSeconds <= 600) return 'text-green-600'; // <= 10 phút
    if (timeSeconds <= 1200) return 'text-yellow-600'; // <= 20 phút
    return 'text-red-600';
  };

  // Tính toán các chỉ số cho màn hình tổng kết
  const timeTakenSeconds = (30 * 60) - timeLeft;
  const accuracyRate = totalQuestionsAttempted > 0 ? (totalCorrectAnswers / totalQuestionsAttempted) * 100 : 0;
  const performanceEval = evaluatePerformance(accuracyRate, timeTakenSeconds);
  const finalScore = Math.max(0, Math.floor(score + (accuracyRate / 10) * 50 - (timeTakenSeconds / 60))); // Công thức điểm ví dụ

  if (loading) return <div className="text-center text-[#00BFFF] py-8 text-lg font-medium animate-pulse">Đang tải flashcard cho Game Mode...</div>;
  if (error) return <div className="text-center text-red-500 py-8 text-lg font-medium">{error}</div>;
  if (flashcards.length === 0) return <div className="text-center text-gray-500 py-8 text-lg font-medium">Chưa có flashcard nào trong chủ đề này để chơi game.</div>;

  return (
    <div className="flex flex-col items-center relative pt-16 min-h-[60vh]">
      {/* Nút Quay lại Chủ đề ở góc trên bên trái */}
      <button
        onClick={() => setCurrentPage('flashcards')}
        className="absolute top-4 left-4 py-2 px-4 bg-[#00BFFF] text-white rounded-full shadow-lg hover:bg-[#009ACD] transition-all duration-300 ease-in-out flex items-center font-semibold text-base z-10 transform hover:scale-105"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Quay lại
      </button>

      {/* Thời gian còn lại ở góc trên bên phải */}
      <div className="absolute top-4 right-4 bg-[#FFD700] text-gray-900 font-bold py-2 px-4 rounded-full shadow-md text-lg">
        Thời gian: {formatTime(timeLeft)}
      </div>

      <h2 className="text-3xl sm:text-4xl font-extrabold mb-8 text-center text-[#008BBE] mt-0">Chế độ Game: <span className="text-gray-900">{topic.name}</span></h2>
      
      {!gameStarted && !gameOver && (
        <div className="text-center">
          <p className="text-xl text-gray-700 mb-6">Bạn có 30 phút để hoàn thành tất cả các từ trong chủ đề này!</p>
          <button
            onClick={startGame}
            className="py-4 px-10 bg-gradient-to-r from-[#28A745] to-[#218838] text-white rounded-full shadow-xl hover:from-[#218838] hover:to-[#1E7E34] transition-transform transform hover:scale-105 font-bold text-xl"
          >
            Bắt đầu Game
          </button>
        </div>
      )}

      {(gameOver || wordsToPlay.length === 0) && gameStarted && ( // Hiển thị màn hình tổng kết khi game over hoặc hoàn thành tất cả từ
        <div className="text-center p-6 bg-white rounded-2xl shadow-lg border border-[#ADD8E6] w-full max-w-2xl">
          <h3 className={`text-3xl font-extrabold mb-4 ${wordsToPlay.length === 0 ? 'text-green-600' : 'text-red-600'}`}>
            {wordsToPlay.length === 0 ? 'Chúc mừng! 🎉' : 'Game Over! 😭'}
          </h3>
          <p className="text-xl text-gray-700 mb-6">
            {wordsToPlay.length === 0 ? 'Bạn đã hoàn thành tất cả các từ!' : 'Thời gian đã hết!'}
          </p>

          <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
            {/* Left side: Total Score and Evaluation (Đã đổi vị trí) */}
            <div className="flex flex-col items-center justify-center w-full sm:w-1/2 p-4 bg-gradient-to-br from-[#ADD8E6] to-[#DDA0DD] rounded-xl shadow-md">
              <p className="text-xl text-white mb-2">Tổng điểm:</p>
              <p className="text-5xl font-extrabold text-white mb-4 animate-pulse">{finalScore}</p>
              <p className="text-lg font-bold text-white text-center">{performanceEval}</p>
            </div>

            {/* Right side: Stats boxes (Đã đổi vị trí) */}
            <div className="flex flex-col gap-3 w-full sm:w-1/2 text-left">
              <div className="p-3 bg-[#E0F2F7] rounded-lg shadow-sm border border-[#ADD8E6]">
                <p className="text-gray-700 text-base">Số câu đã làm:</p>
                <p className="text-2xl font-bold text-[#008BBE]">{totalQuestionsAttempted}</p>
              </div>
              <div className="p-3 bg-[#E0F2F7] rounded-lg shadow-sm border border-[#ADD8E6]">
                <p className="text-gray-700 text-base">Tỷ lệ chính xác:</p>
                <p className={`text-2xl font-bold ${getAccuracyColorClass(accuracyRate)}`}>{accuracyRate.toFixed(2)}%</p>
              </div>
              <div className="p-3 bg-[#E0F2F7] rounded-lg shadow-sm border border-[#ADD8E6]">
                <p className="text-gray-700 text-base">Thời gian làm bài:</p>
                <p className={`text-2xl font-bold ${getTimeColorClass(timeTakenSeconds)}`}>{formatTime(timeTakenSeconds)}</p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={startGame}
              className="py-3 px-8 bg-gradient-to-r from-[#00BFFF] to-[#009ACD] text-white rounded-full shadow-lg hover:from-[#009ACD] hover:to-[#008BBE] transition-transform transform hover:scale-105 font-bold text-lg"
            >
              Chơi lại
            </button>
            <button
              onClick={() => setCurrentPage('courses')}
              className="py-3 px-8 bg-gradient-to-r from-[#6c757d] to-[#5a6268] text-white rounded-full shadow-lg hover:from-[#5a6268] hover:to-[#4e555b] transition-transform transform hover:scale-105 font-bold text-lg"
            >
              Trở về Khóa học
            </button>
          </div>
        </div>
      )}

      {gameStarted && !gameOver && wordsToPlay.length > 0 && currentQuestion && (
        <div className="w-full max-w-lg">
          <p className="text-right text-gray-700 text-lg font-medium mb-4">
            Từ còn lại: {wordsToPlay.length}
          </p>
          {currentGameType === 'multipleChoice' && (
            <MultipleChoiceGame
              question={currentQuestion}
              onCorrect={handleCorrectAnswer}
              onIncorrect={handleIncorrectAnswer}
            />
          )}
          {currentGameType === 'fillInBlank' && (
            <FillInBlankGame
              question={currentQuestion}
              onCorrect={handleCorrectAnswer}
              onIncorrect={handleGameSpecificIncorrectAnswer}
            />
          )}
          {currentGameType === 'matching' && (
            <MatchingGame
              question={currentQuestion}
              onCorrect={handleCorrectAnswer}
              onIncorrect={handleGameSpecificIncorrectAnswer}
              wordsToPlay={wordsToPlay} // Truyền wordsToPlay để MatchingGame có thể chọn từ mới
              generateNewQuestion={generateNewQuestion} // Truyền hàm để MatchingGame tạo câu hỏi mới
            />
          )}
        </div>
      )}
    </div>
  );
}

// MultipleChoiceGame Component
function MultipleChoiceGame({ question, onCorrect, onIncorrect }) {
  const [feedback, setFeedback] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);

  useEffect(() => {
    setFeedback('');
    setSelectedOption(null);
    setIsAnswered(false);
  }, [question]);

  const handleAnswer = (option) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    if (option === question.word.back) {
      setFeedback('Đúng rồi! 🎉');
      setTimeout(() => {
        onCorrect(question.word.id);
      }, 1000);
    } else {
      setFeedback(`Sai rồi. Đáp án đúng là: "${question.word.back}"`);
      setTimeout(() => {
        onIncorrect();
      }, 2000);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-[#ADD8E6] text-center">
      <h3 className="text-2xl font-bold text-[#008BBE] mb-6">{question.word.front}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleAnswer(option)}
            disabled={isAnswered}
            className={`py-3 px-6 rounded-lg font-semibold text-lg transition-all duration-300 ease-in-out transform hover:scale-105
              ${isAnswered && option === question.word.back ? 'bg-green-500 text-white' : ''}
              ${isAnswered && option === selectedOption && option !== question.word.back ? 'bg-red-500 text-white' : ''}
              ${!isAnswered ? 'bg-[#E0F2F7] text-[#009ACD] hover:bg-[#D4EEF7]' : 'bg-gray-200 text-gray-600 cursor-not-allowed'}
            `}
          >
            {option}
          </button>
        ))}
      </div>
      {feedback && (
        <p className={`mt-4 text-xl font-bold ${feedback.includes('Đúng') ? 'text-green-600' : 'text-red-600'} animate-fade-in`}>
          {feedback}
        </p>
      )}
    </div>
  );
}

// FillInBlankGame Component
function FillInBlankGame({ question, onCorrect, onIncorrect }) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [isAnswered, setIsAnswered] = useState(false);

  useEffect(() => {
    setAnswer('');
    setFeedback('');
    setShowCorrectAnswer(false);
    setIsAnswered(false);
  }, [question]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isAnswered) return;
    setIsAnswered(true);

    const correctAnswer = question.isEnglishPrompt ? question.word.back : question.word.front;
    if (answer.trim().toLowerCase() === correctAnswer.toLowerCase()) {
      setFeedback('Đúng rồi! 🎉');
      setTimeout(() => {
        onCorrect(question.word.id);
      }, 1000);
    } else {
      setFeedback('Sai rồi.');
      setShowCorrectAnswer(true);
      setTimeout(() => {
        // Gọi onIncorrect mà không truyền dữ liệu, để GameMode tự động tạo câu hỏi mới
        onIncorrect();
      }, 2000);
    }
  };

  const promptText = question.isEnglishPrompt ? question.word.front : question.word.back;

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-[#ADD8E6] text-center">
      <h3 className="text-2xl font-bold text-[#008BBE] mb-6">Điền nghĩa cho từ: "{promptText}"</h3>
      <form onSubmit={handleSubmit} className="flex flex-col items-center">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Nhập câu trả lời của bạn"
          className="w-full max-w-sm p-3 border border-[#ADD8E6] rounded-lg mb-4 text-lg focus:outline-none focus:ring-2 focus:ring-[#00BFFF]"
          disabled={isAnswered}
        />
        <button
          type="submit"
          disabled={isAnswered}
          className={`py-3 px-8 rounded-full text-white font-bold text-lg shadow-lg transition-all duration-300 ease-in-out transform hover:scale-105 ${
            isAnswered ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-[#00BFFF] to-[#009ACD] hover:from-[#009ACD] hover:to-[#008BBE]'
          }`}
        >
          Kiểm tra
        </button>
      </form>
      {feedback && (
        <p className={`mt-4 text-xl font-bold ${feedback.includes('Đúng') ? 'text-green-600' : 'text-red-600'} animate-fade-in`}>
          {feedback}
        </p>
      )}
      {showCorrectAnswer && (
        <p className="mt-2 text-lg text-gray-700 animate-fade-in">
          Đáp án đúng: <span className="font-bold text-[#008BBE]">{question.isEnglishPrompt ? question.word.back : question.word.front}</span>
        </p>
      )}
    </div>
  );
}

// MatchingGame Component
function MatchingGame({ question, onCorrect, onIncorrect, wordsToPlay, generateNewQuestion }) {
  const [leftColumn, setLeftColumn] = useState([]);
  const [rightColumn, setRightColumn] = useState([]);
  const [selectedLeft, setSelectedLeft] = useState(null);
  const [selectedRight, setSelectedRight] = useState(null);
  const [matchedPairs, setMatchedPairs] = useState([]); // Lưu trữ ID của các cặp đã khớp
  const [feedback, setFeedback] = useState('');
  const [tries, setTries] = useState(0); // Số lần thử cho câu hỏi hiện tại

  // Define handleSelect here, ensuring it's in scope
  const handleSelect = (item, columnType) => {
    console.log("handleSelect called with:", item, columnType); // Debug log
    if (columnType === 'left') {
      setSelectedLeft(item);
    } else {
      setSelectedRight(item);
    }
  };

  useEffect(() => {
    // Khởi tạo lại game khi câu hỏi thay đổi
    // Thêm thuộc tính 'matched' để theo dõi trạng thái khớp của từng từ
    const shuffledEnglish = shuffleArray(question.words.map(w => ({ id: w.id, text: w.front, type: 'front', matched: false })));
    const shuffledVietnamese = shuffleArray(question.words.map(w => ({ id: w.id, text: w.back, type: 'back', matched: false })));
    setLeftColumn(shuffledEnglish);
    setRightColumn(shuffledVietnamese);
    setSelectedLeft(null);
    setSelectedRight(null);
    setMatchedPairs([]);
    setFeedback('');
    setTries(0); // Reset số lần thử khi câu hỏi mới
  }, [question]);

  useEffect(() => {
    if (selectedLeft && selectedRight) {
      const isMatch = selectedLeft.id === selectedRight.id;

      if (isMatch) {
        setFeedback('Đúng cặp! ✅');
        setMatchedPairs(prev => [...prev, selectedLeft.id]);

        // Cập nhật trạng thái 'matched' cho các từ đã khớp
        setLeftColumn(prev => prev.map(item =>
          item.id === selectedLeft.id ? { ...item, matched: true } : item
        ));
        setRightColumn(prev => prev.map(item =>
          item.id === selectedRight.id ? { ...item, matched: true } : item
        ));
        
        // Gọi onCorrect cho từ đã khớp
        onCorrect(selectedLeft.id);

        setSelectedLeft(null);
        setSelectedRight(null);

        // Chuyển câu hỏi nếu tất cả các cặp đã được khớp trong câu hỏi hiện tại
        if (matchedPairs.length + 1 === question.words.length) { // +1 vì matchedPairs chưa được cập nhật kịp
            setTimeout(() => {
                // Lọc các từ đã khớp khỏi wordsToPlay trước khi tạo câu hỏi mới
                const remainingWordsAfterMatch = wordsToPlay.filter(w => !matchedPairs.includes(w.id) && w.id !== selectedLeft.id);
                onIncorrect(generateNewQuestion(remainingWordsAfterMatch)); 
            }, 1000); // 1 giây sau khi hoàn thành
        } else {
            setTimeout(() => {
                setFeedback(''); // Xóa feedback sau khi khớp đúng
            }, 1000);
        }

      } else {
        setFeedback('Sai rồi. ❌');
        setTries(prev => prev + 1); // Tăng số lần thử sai
        setTimeout(() => {
          setFeedback('');
          setSelectedLeft(null);
          setSelectedRight(null);
          // Không chuyển câu hỏi ở đây, mà để logic tries >= 2 xử lý
        }, 1000); // 1 giây để người dùng thấy feedback
      }
    }
  }, [selectedLeft, selectedRight, matchedPairs, question.words, onCorrect, onIncorrect, wordsToPlay, generateNewQuestion]); // Thêm dependencies

  // Xử lý khi người dùng trả lời sai 2 lần
  useEffect(() => {
    if (tries >= 2) {
      setFeedback('Hết lượt thử! Chuyển câu khác. ⏭️');
      setTimeout(() => {
        // Chuyển sang câu hỏi mới mà không loại bỏ từ
        onIncorrect(generateNewQuestion(wordsToPlay)); // Chuyển câu hỏi
      }, 2000); // 2 giây sau khi hết lượt thử
    }
  }, [tries, onIncorrect, wordsToPlay, generateNewQuestion]);


  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-[#ADD8E6] text-center">
      <h3 className="text-2xl font-bold text-[#008BBE] mb-6">Nối từ:</h3>
      <div className="flex flex-col sm:flex-row justify-around gap-4 mb-6">
        <div className="flex flex-col gap-3 w-full sm:w-1/2">
          {leftColumn.map(item => (
            <button
              key={item.id}
              onClick={() => handleSelect(item, 'left')}
              className={`py-3 px-4 rounded-lg font-semibold text-lg transition-all duration-200 ease-in-out
                ${selectedLeft?.id === item.id ? 'bg-[#00BFFF] text-white shadow-md' : ''}
                ${item.matched ? 'bg-white text-green-700 border-2 border-green-500 shadow-md cursor-not-allowed' : 'bg-[#E0F2F7] text-[#009ACD] hover:bg-[#D4EEF7]'}
                ${matchedPairs.includes(item.id) ? 'opacity-100' : ''} /* Giữ opacity 100% cho các từ đã khớp */
              `}
              disabled={item.matched} // Chỉ vô hiệu hóa nút đã khớp
            >
              {item.text}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3 w-full sm:w-1/2">
          {rightColumn.map(item => (
            <button
              key={item.id}
              onClick={() => handleSelect(item, 'right')}
              className={`py-3 px-4 rounded-lg font-semibold text-lg transition-all duration-200 ease-in-out
                ${selectedRight?.id === item.id ? 'bg-[#00BFFF] text-white shadow-md' : ''}
                ${item.matched ? 'bg-white text-green-700 border-2 border-green-500 shadow-md cursor-not-allowed' : 'bg-[#E0F2F7] text-[#009ACD] hover:bg-[#D4EEF7]'}
                ${matchedPairs.includes(item.id) ? 'opacity-100' : ''} /* Giữ opacity 100% cho các từ đã khớp */
              `}
              disabled={item.matched} // Chỉ vô hiệu hóa nút đã khớp
            >
              {item.text}
            </button>
          ))}
        </div>
      </div>
      {feedback && (
        <p className={`mt-4 text-xl font-bold ${feedback.includes('Đúng') || feedback.includes('Hoàn thành') ? 'text-green-600' : 'text-red-600'} animate-fade-in`}>
          {feedback}
        </p>
      )}
      {/* Hiển thị số lần thử sai chỉ khi feedback là "Sai rồi." và chưa hết lượt */}
      {feedback.includes('Sai rồi.') && tries > 0 && tries < 2 && (
        <p className="mt-2 text-md text-gray-500">Bạn đã thử sai {tries} lần.</p>
      )}
    </div>
  );
}


// InitialDataLoader Component: Tải dữ liệu mẫu ban đầu vào Firestore nếu chưa có.
// Điều này giúp ứng dụng có sẵn dữ liệu để người dùng trải nghiệm ngay.
function InitialDataLoader({ onDataLoaded }) {
  // Lấy đối tượng db từ FirebaseContext.
  const { db } = useContext(FirebaseContext);
  const [loading, setLoading] = useState(true); // Trạng thái đang tải dữ liệu mẫu
  const [message, setMessage] = useState(''); // Thông báo cho người dùng

  // useEffect để thực hiện tải dữ liệu mẫu.
  // Chạy lại khi db hoặc onDataLoaded thay đổi.
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      setMessage('');
      try {
        // Tham chiếu đến collection 'courses'.
        const coursesCollectionRef = collection(db, `artifacts/${__app_id}/public/data/courses`);
        // Kiểm tra xem đã có bất kỳ khóa học nào tồn tại chưa.
        const existingCoursesSnapshot = await getDocs(coursesCollectionRef);

        // Nếu chưa có khóa học nào, tiến hành thêm dữ liệu mẫu.
        if (existingCoursesSnapshot.empty) {
          setMessage('Đang tải dữ liệu mẫu lần đầu...');

          // Thêm khóa học "Môi trường"
          const envCourseRef = await addDoc(coursesCollectionRef, {
            name: "Môi trường",
            description: "Khóa học về các vấn đề môi trường toàn cầu và giải pháp bền vững.",
            createdAt: new Date(),
          });

          // Thêm chủ đề "Ô nhiễm môi trường" cho khóa "Môi trường"
          const pollutionTopicRef = await addDoc(collection(db, `artifacts/${__app_id}/public/data/topics`), {
            courseId: envCourseRef.id,
            name: "Ô nhiễm môi trường",
            description: "Tìm hiểu về các loại ô nhiễm và tác động của chúng.",
            createdAt: new Date(),
          });
          // Thêm các flashcard cho chủ đề "Ô nhiễm môi trường"
          await addDoc(collection(db, `artifacts/${__app_id}/public/data/flashcards`), {
            topicId: pollutionTopicRef.id, front: "Environmental pollution", back: "Ô nhiễm môi trường", type: "n.", createdAt: new Date(),
          });
          await addDoc(collection(db, `artifacts/${__app_id}/public/data/flashcards`), {
            topicId: pollutionTopicRef.id, front: "Air pollution", back: "Ô nhiễm không khí", type: "n.", createdAt: new Date(),
          });
          await addDoc(collection(db, `artifacts/${__app_id}/public/data/flashcards`), {
            topicId: pollutionTopicRef.id, front: "Water pollution", back: "Ô nhiễm nước", type: "n.", createdAt: new Date(),
          });
          await addDoc(collection(db, `artifacts/${__app_id}/public/data/flashcards`), {
            topicId: pollutionTopicRef.id, front: "Soil contamination", back: "Ô nhiễm đất", type: "n.", createdAt: new Date(),
          });
          await addDoc(collection(db, `artifacts/${__app_id}/public/data/flashcards`), {
            topicId: pollutionTopicRef.id, front: "Deforestation", back: "Phá rừng", type: "n.", createdAt: new Date(),
          });
          await addDoc(collection(db, `artifacts/${__app_id}/public/data/flashcards`), {
            topicId: pollutionTopicRef.id, front: "Greenhouse gases", back: "Khí nhà kính", type: "n.", createdAt: new Date(),
          });

          // Thêm khóa học "Công nghệ"
          const techCourseRef = await addDoc(coursesCollectionRef, {
            name: "Công nghệ",
            description: "Khóa học về các công nghệ mới nổi và ứng dụng của chúng trong đời sống.",
            createdAt: new Date(),
          });

          // Thêm chủ đề "Trí tuệ nhân tạo (AI)" cho khóa "Công nghệ"
          const aiTopicRef = await addDoc(collection(db, `artifacts/${__app_id}/public/data/topics`), {
            courseId: techCourseRef.id,
            name: "Trí tuệ nhân tạo (AI)",
            description: "Giới thiệu về AI và các ứng dụng cơ bản.",
            createdAt: new Date(),
          });
          // Thêm các flashcard cho chủ đề "Trí tuệ nhân tạo (AI)"
          await addDoc(collection(db, `artifacts/${__app_id}/public/data/flashcards`), {
            topicId: aiTopicRef.id, front: "Artificial Intelligence", back: "Trí tuệ nhân tạo", type: "n.", createdAt: new Date(),
          });
          await addDoc(collection(db, `artifacts/${__app_id}/public/data/flashcards`), {
            topicId: aiTopicRef.id, front: "Machine Learning", back: "Học máy", type: "n.", createdAt: new Date(),
          });

          // Thêm chủ đề "Blockchain" cho khóa "Công nghệ"
          const blockchainTopicRef = await addDoc(collection(db, `artifacts/${__app_id}/public/data/topics`), {
            courseId: techCourseRef.id,
            name: "Blockchain",
            description: "Tìm hiểu về công nghệ blockchain và tiền điện tử.",
            createdAt: new Date(),
          });
          // Thêm các flashcard cho chủ đề "Blockchain"
          await addDoc(collection(db, `artifacts/${__app_id}/public/data/flashcards`), {
            topicId: blockchainTopicRef.id, front: "Blockchain", back: "Công nghệ chuỗi khối", type: "n.", createdAt: new Date(),
          });
          await addDoc(collection(db, `artifacts/${__app_id}/public/data/flashcards`), {
            topicId: blockchainTopicRef.id, front: "Cryptocurrency", back: "Tiền điện tử", type: "n.", createdAt: new Date(),
          });

          setMessage('Dữ liệu mẫu đã được tải thành công!');
        } else {
          setMessage('Dữ liệu mẫu đã tồn tại.');
        }
        onDataLoaded(); // Gọi callback để ẩn component này sau khi dữ liệu đã sẵn sàng
      } catch (e) {
        console.error("Lỗi khi tải dữ liệu mẫu: ", e);
        setMessage('Lỗi khi tải dữ liệu mẫu. Vui lòng kiểm tra console.');
      } finally {
        setLoading(false); // Kết thúc trạng thái tải
      }
    };

    if (db) { // Chỉ chạy khi đối tượng db đã được khởi tạo
      loadInitialData();
    }
  }, [db, onDataLoaded]); // Dependency array: useEffect chạy lại khi db hoặc onDataLoaded thay đổi.

  // Hiển thị giao diện tải dữ liệu mẫu.
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-[#E0F2F7] to-[#F0F8FF] rounded-xl shadow-inner border border-[#ADD8E6]">
        <h2 className="text-2xl font-extrabold text-[#008BBE] mb-6 text-center">Đang tải dữ liệu mẫu...</h2>
        <p className="text-gray-700 text-center mb-8 text-base leading-relaxed">
          Vui lòng đợi trong giây lát. Dữ liệu sẽ tự động được tải vào ứng dụng.
        </p>
        <div className="w-16 h-16 border-4 border-[#00BFFF] border-dashed rounded-full animate-spin"></div>
        {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}
      </div>
    );
  }
  return null; // Không hiển thị gì khi không loading
}

export default App;
