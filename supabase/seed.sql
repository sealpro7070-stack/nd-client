-- Nilam Auto: Seed Data — 30 books for Malaysian secondary school students
-- 12 Melayu, 12 Inggeris, 3 Cina, 3 Tamil

insert into books (title, author, publisher, year, pages, category, language, synopsis, moral, isbn) values

-- ==================== MELAYU (12) ====================
(
  'Leftenan Adnan',
  'Mohd Noor Azam',
  'Dewan Bahasa dan Pustaka',
  2018, 180, 'Sejarah', 'Melayu',
  'Novel ini menceritakan kisah benar Leftenan Adnan Saidi, seorang wira Melayu yang gugur mempertahankan Bukit Chandu di Singapura semasa Perang Dunia Kedua. Beliau memimpin pasukan Rejimen Melayu menentang tentera Jepun dengan penuh keberanian walaupun mengetahui mereka berada dalam bilangan yang jauh lebih kecil. Semangat patriotisme dan kesetiaan Adnan kepada tanah air menjadi inspirasi kepada generasi muda Malaysia.',
  'Keberanian, patriotisme, dan pengorbanan diri untuk negara adalah nilai murni yang perlu dijadikan teladan oleh generasi muda.',
  '978-983-46-1234-5'
),
(
  'Tenggelamnya Kapal Van Der Wijck',
  'Hamka',
  'Pustaka Antara',
  2015, 320, 'Novel Klasik', 'Melayu',
  'Kisah cinta tragis antara Zainuddin dan Hayati yang dipisahkan oleh adat resam dan perbezaan darjat dalam masyarakat Minangkabau. Zainuddin, seorang pemuda miskin dari Makassar, jatuh cinta kepada Hayati yang cantik dan berbudi. Namun tekanan keluarga dan adat memaksa Hayati berkahwin dengan lelaki lain. Novel ini mengkritik adat kolot yang menindas hak individu untuk bahagia.',
  'Cinta sejati tidak mengenal darjat, namun tekanan masyarakat boleh menghancurkan impian. Kita harus berani menentang adat yang tidak adil.',
  '978-983-12-3456-7'
),
(
  'Interlok',
  'Abdullah Hussain',
  'Dewan Bahasa dan Pustaka',
  2010, 390, 'Novel', 'Melayu',
  'Novel ini menggambarkan kehidupan tiga kaum utama di Malaysia — Melayu, Cina, dan India — melalui kisah keluarga Seman, Yam, dan Maniam. Latar belakang zaman penjajahan British hingga kemerdekaan Malaysia dipaparkan dengan teliti. Penulis menekankan kepentingan perpaduan kaum dan kefahaman antara budaya untuk membina negara yang harmoni dan maju.',
  'Perpaduan kaum adalah teras kekuatan sesebuah negara. Kita mesti menghormati dan memahami budaya kaum lain untuk hidup berdamai.',
  '978-983-46-2345-6'
),
(
  'Arena Wira',
  'Keris Mas',
  'Dewan Bahasa dan Pustaka',
  2012, 210, 'Novel Sukan', 'Melayu',
  'Seorang pemuda kampung bernama Razif berjuang keras untuk menjadi atlet silat peringkat kebangsaan. Menghadapi pelbagai cabaran termasuk kemiskinan keluarga, persaingan sengit, dan kecederaan, Razif tidak pernah berputus asa. Dengan sokongan guru silatnya yang berpengalaman dan semangat yang membara, dia akhirnya berjaya mewakili Malaysia dalam pertandingan antarabangsa.',
  'Ketekunan, disiplin diri, dan semangat tidak mudah mengalah adalah kunci kejayaan dalam apa jua bidang yang diceburi.',
  '978-983-46-3456-7'
),
(
  'Rumah Itu Duniaku',
  'Aminah Mokhtar',
  'PTS Publications',
  2019, 240, 'Keluarga', 'Melayu',
  'Menceritakan kehidupan seorang ibu tunggal bernama Ramlah yang berusaha membesarkan empat orang anaknya selepas kematian suami. Dalam kesempitan hidup dan tekanan ekonomi, Ramlah tidak pernah mengalah. Dia bekerja keras sebagai tukang jahit sambil memastikan anak-anaknya mendapat pendidikan yang baik. Novel ini menggambarkan kasih sayang ibu yang tiada batas dan pengorbanan yang tidak ternilai.',
  'Kasih sayang ibu adalah pengorbanan yang paling murni. Anak-anak perlu menghargai susah payah ibu bapa dalam membesarkan mereka.',
  '978-967-411-234-5'
),
(
  'Silir Duyung',
  'A. Samad Said',
  'Dewan Bahasa dan Pustaka',
  2011, 265, 'Novel Sosial', 'Melayu',
  'Novel ini mengisahkan kehidupan masyarakat nelayan di persisiran pantai Malaysia yang berjuang menentang kemiskinan dan eksploitasi. Watak utama, Pak Dol, adalah seorang nelayan tua yang bijaksana dan dihormati. Dia menghadapi ancaman pemaju hartanah yang mahu merampas tanah kampung mereka. Perjuangan mempertahankan tanah warisan dan cara hidup tradisi menjadi tema utama cerita ini.',
  'Kita mesti mempertahankan hak dan warisan kita. Kerakusan manusia tidak boleh dibiarkan menghancurkan komuniti dan alam sekitar.',
  '978-983-46-4567-8'
),
(
  'Hujan Pagi',
  'A. Samad Said',
  'Dewan Bahasa dan Pustaka',
  2008, 190, 'Novel Sosial', 'Melayu',
  'Kisah seorang wartawan muda bernama Buyong yang menyiasat kes rasuah dalam sebuah syarikat besar. Perjalanannya mendedahkan jaringan rasuah yang melibatkan orang-orang berkuasa membawa bahaya kepada dirinya. Dengan keberanian dan integriti, Buyong meneruskan siasatannya walaupun nyawanya terancam, membuktikan bahawa kebenaran perlu didaulatkan.',
  'Integriti dan keberanian untuk mendedahkan kebenaran adalah tanggungjawab moral setiap individu dalam masyarakat.',
  '978-983-46-5678-9'
),
(
  'Anak Mat Lela Gila',
  'Ishak Haji Muhammad',
  'Dewan Bahasa dan Pustaka',
  2014, 175, 'Novel Klasik', 'Melayu',
  'Sebuah satira sosial yang mengkritik masyarakat Melayu pada zaman penjajahan. Kisah seorang lelaki yang dianggap gila oleh masyarakat tetapi sebenarnya mempunyai kebijaksanaan yang mendalam tentang keadaan sosial dan politik semasa. Melalui tingkah lakunya yang luar biasa, dia menyampaikan kritikan tajam terhadap kemunafikan dan ketidakadilan dalam masyarakat.',
  'Kadang-kala kebenaran disampaikan melalui cara yang tidak konvensional. Jangan menghakimi seseorang berdasarkan penampilan luaran semata-mata.',
  '978-983-46-6789-0'
),
(
  'Harimau! Harimau!',
  'Mohd. Affandi Hassan',
  'Dewan Bahasa dan Pustaka',
  2016, 220, 'Alam Semula Jadi', 'Melayu',
  'Novel ini mengisahkan kehidupan sekumpulan pemburu yang terperangkap dalam hutan hubungan antara manusia dan alam liar. Apabila seekor harimau membalas dendam kerana anaknya dibunuh, ia menghuru-harakan kampung. Persepsi manusia terhadap harimau sebagai musuh berubah apabila mereka menyedari bahawa merekalah yang telah mencerobohi kawasan harimau. Novel ini membangkitkan kesedaran tentang kepentingan alam sekitar.',
  'Alam semula jadi perlu dihormati dan dipelihara. Manusia tidak berhak merampas habitat hidupan liar secara sewenang-wenangnya.',
  '978-983-46-7890-1'
),
(
  'Seteguh Karang',
  'Norhaslinda Jamaudin',
  'PTS Publications',
  2020, 198, 'Motivasi', 'Melayu',
  'Kisah benar seorang pelajar OKU yang berjaya mendapat keputusan cemerlang dalam peperiksaan SPM walaupun mempunyai masalah penglihatan. Adam tidak pernah menggunakan kecacatannya sebagai alasan untuk gagal. Dengan sokongan keluarga, guru-guru yang prihatin, dan semangatnya yang membara, dia membuktikan bahawa keterbatasan fizikal bukan penghalang kepada kejayaan akademik dan kehidupan.',
  'Keterbatasan fizikal bukan penghalang kepada kejayaan. Dengan tekad yang kuat dan sokongan orang sekeliling, segalanya menjadi mungkin.',
  '978-967-411-345-6'
),
(
  'Kasih Yang Suci',
  'Hlovate',
  'Alaf 21',
  2017, 310, 'Remaja', 'Melayu',
  'Novel remaja yang mengisahkan perjalanan seorang gadis bernama Laila yang mencari identiti dirinya antara nilai-nilai Islam dan cabaran kehidupan moden. Melalui persahabatan, percintaan, dan pengalaman hidup, Laila belajar untuk menjadi dirinya sendiri tanpa terpengaruh dengan tekanan rakan sebaya. Novel ini popular di kalangan remaja kerana mesejnya yang relevan dan gaya penulisannya yang segar.',
  'Jati diri yang kukuh berteraskan nilai agama adalah benteng terbaik menghadapi pengaruh negatif. Jadilah diri sendiri dengan penuh keyakinan.',
  '978-967-400-123-4'
),
(
  'Tun Fatimah',
  'Harun Aminurrashid',
  'Penerbitan Pustaka Nasional',
  2013, 285, 'Sejarah', 'Melayu',
  'Kisah epik tentang Tun Fatimah, wanita berpengaruh dalam sejarah Kesultanan Melayu Melaka. Sebagai anak pembesar dan isteri kepada dua orang pembesar penting, Tun Fatimah memainkan peranan besar dalam politik Melaka. Novel ini menggambarkan kecerdasan, keberanian, dan pengorbanannya dalam mempertahankan maruah dan keadilan di tengah-tengah intrik politik istana Melaka.',
  'Wanita mampu memainkan peranan penting dalam sejarah dan politik. Keberanian dan kecerdasan tidak mengenal jantina.',
  '978-983-46-8901-2'
),

-- ==================== INGGERIS (12) ====================
(
  'To Kill a Mockingbird',
  'Harper Lee',
  'HarperCollins',
  2002, 281, 'Classic Fiction', 'Inggeris',
  'Set in the fictional town of Maycomb, Alabama during the 1930s, this novel follows young Scout Finch as her father Atticus defends a Black man named Tom Robinson falsely accused of raping a white woman. Through Scout''s innocent eyes, the reader witnesses the deep racial injustice and social inequality of the American South. The story explores themes of empathy, moral courage, and the loss of innocence as Scout comes to understand the complexities of adult society.',
  'True courage means standing up for what is right even when the whole world is against you. Empathy and understanding are more powerful than prejudice.',
  '978-0-06-112008-4'
),
(
  'The Outsiders',
  'S.E. Hinton',
  'Penguin Books',
  2006, 192, 'Young Adult', 'Inggeris',
  'Fourteen-year-old Ponyboy Curtis belongs to the Greasers, a gang of working-class boys who are constantly at war with the Socs, the wealthy kids from the other side of town. When a tragic incident escalates the rivalry, Ponyboy and his friend Johnny must flee and face life-altering consequences. The novel explores class conflict, loyalty, and what it truly means to be brave in a world that judges people by their social status.',
  'Social class should never define a person''s worth or character. True friendship transcends background and circumstances.',
  '978-0-14-038572-4'
),
(
  'The Giver',
  'Lois Lowry',
  'HMH Books for Young Readers',
  2014, 179, 'Science Fiction', 'Inggeris',
  'In a seemingly perfect community where pain, conflict, and choice have been eliminated, twelve-year-old Jonas is chosen to receive the memories of the past from an old man called the Giver. As Jonas discovers the truth about his society''s dark secrets and the real cost of their so-called utopia, he must make a courageous decision about his future. This thought-provoking dystopian novel challenges readers to think about freedom, individuality, and what truly makes life worth living.',
  'True happiness cannot exist without freedom and the ability to make choices, even painful ones. Conformity at the cost of humanity is not peace.',
  '978-0-544-33649-5'
),
(
  'Animal Farm',
  'George Orwell',
  'Penguin Books',
  1996, 112, 'Classic Fiction', 'Inggeris',
  'A satirical allegorical novella about a group of farm animals who rebel against their human farmer, hoping to create a society where all animals are equal and free. Led initially by the pigs, the revolution succeeds but gradually the new leaders become as corrupt and tyrannical as the humans they replaced. Through this simple but powerful fable, Orwell critiques totalitarianism, propaganda, and the corruption that comes with unchecked power.',
  'Power corrupts those who abuse it. A society built on equality can only survive if its leaders remain accountable and honest.',
  '978-0-14-303943-3'
),
(
  'The Alchemist',
  'Paulo Coelho',
  'HarperOne',
  2014, 197, 'Inspirational Fiction', 'Inggeris',
  'A young Andalusian shepherd named Santiago dreams of finding treasure near the Egyptian pyramids and embarks on a journey that takes him from Spain through Morocco and across the Sahara desert. Along the way he meets a series of extraordinary characters who teach him about the Soul of the World and listening to his heart. This internationally beloved novel is a philosophical adventure about following your dreams and recognising the signs the universe sends us.',
  'When you truly want something, the universe conspires to help you achieve it. Listen to your heart and pursue your Personal Legend with courage.',
  '978-0-06-231500-7'
),
(
  'Wonder',
  'R.J. Palacio',
  'Knopf Books',
  2012, 315, 'Young Adult', 'Inggeris',
  'Ten-year-old August Pullman was born with a severe facial difference that has prevented him from attending mainstream school. When he enters fifth grade at Beecher Prep, he faces the challenge of fitting in among classmates who stare, whisper, and sometimes bully him. Told from multiple perspectives including friends and family, this deeply moving novel shows how one child''s bravery can transform an entire school community and teach everyone the meaning of true kindness.',
  'Kindness is always the right choice. We should choose to look beyond appearances and judge people by the content of their character.',
  '978-0-375-86902-0'
),
(
  'The Hunger Games',
  'Suzanne Collins',
  'Scholastic Press',
  2008, 374, 'Science Fiction', 'Inggeris',
  'In a dystopian future nation called Panem, sixteen-year-old Katniss Everdeen volunteers to take her younger sister''s place in the annual Hunger Games — a televised fight to the death between tributes from each of the twelve districts. Thrust into a brutal arena, Katniss must use her survival skills and wits against twenty-three other teenagers. The novel is a gripping exploration of survival, sacrifice, media manipulation, and rebellion against oppressive authority.',
  'Sacrifice for those you love is the greatest act of courage. One brave act can inspire thousands to rise against injustice.',
  '978-0-439-02348-1'
),
(
  'Holes',
  'Louis Sachar',
  'Yearling',
  2000, 233, 'Young Adult', 'Inggeris',
  'Stanley Yelnats, a boy from a family plagued by bad luck, is sent to Camp Green Lake, a juvenile detention center in the middle of the Texas desert where there is no lake. Every day the boys are forced to dig holes exactly five feet wide and five feet deep. As Stanley uncovers the camp''s dark secret and his own family''s buried history, the story weaves together past and present in a brilliantly constructed narrative about fate, justice, and friendship.',
  'Our actions and choices echo through generations. Friendship and perseverance can break even the most stubborn cycles of bad luck and injustice.',
  '978-0-440-41480-9'
),
(
  'The Boy in the Striped Pyjamas',
  'John Boyne',
  'David Fickling Books',
  2006, 216, 'Historical Fiction', 'Inggeris',
  'Nine-year-old Bruno, the son of a Nazi commandant, moves with his family to a desolate area near a concentration camp he calls Out-With. Lonely and bored, he explores and discovers Shmuel, a Jewish boy his own age, sitting on the other side of a fence in striped pyjamas. Their unlikely friendship unfolds with devastating consequences. Told from Bruno''s naive perspective, this novel powerfully illustrates how hatred and prejudice destroy innocent lives.',
  'Hatred and prejudice have devastating consequences for the innocent. True friendship sees no race, religion, or background.',
  '978-0-385-75106-5'
),
(
  'Tuesdays with Morrie',
  'Mitch Albom',
  'Doubleday',
  1997, 192, 'Non-fiction', 'Inggeris',
  'Sports journalist Mitch Albom reunites with his favourite college professor, Morrie Schwartz, who is dying from ALS. Every Tuesday for fourteen weeks, Mitch visits Morrie and they discuss the meaning of life, love, work, family, and death. Drawing on these conversations, Albom creates a profound and moving memoir that became one of the best-selling books of all time. Morrie''s wisdom about living fully despite dying offers timeless lessons for readers of all ages.',
  'Life is most meaningful when we invest in relationships and love, not possessions or status. Embrace every day as a precious gift.',
  '978-0-7679-0592-5'
),
(
  'The Secret Garden',
  'Frances Hodgson Burnett',
  'Penguin Classics',
  2011, 331, 'Classic Fiction', 'Inggeris',
  'After her parents die in a cholera epidemic in India, ten-year-old Mary Lennox is sent to live with her reclusive uncle in a gloomy manor on the Yorkshire moors. Bored and spoiled, she discovers a hidden walled garden that has been locked for ten years. As she works to bring the garden back to life with her new friend Dickon, she also befriends her bedridden cousin Colin and helps transform all their lives through the magic of nature, friendship, and positive thinking.',
  'Growth and healing begin when we open ourselves to nature, friendship, and positive thinking. A nurturing environment transforms both gardens and people.',
  '978-0-14-143956-0'
),
(
  'Fahrenheit 451',
  'Ray Bradbury',
  'Simon & Schuster',
  2012, 256, 'Science Fiction', 'Inggeris',
  'In a future American society where books are outlawed and burned by firemen, Guy Montag is a fireman who begins to question his role after meeting his free-spirited teenage neighbor Clarisse. When Montag witnesses an old woman choose to die with her books rather than live without them, he begins secretly collecting books and is drawn into an underground network of book lovers. This timeless classic warns against censorship, intellectual conformity, and the dangers of a society that abandons critical thinking.',
  'Knowledge and free thought are essential to human dignity. A society that burns books and suppresses ideas destroys its own humanity.',
  '978-1-4516-7331-9'
),

-- ==================== CINA (3) ====================
(
  '骆驼祥子',
  '老舍',
  '人民文学出版社',
  2016, 248, '经典小说', 'Cina',
  '这部小说讲述了祥子，一个来自农村的年轻人，来到北京渴望通过拉人力车改变自己的命运。他三次努力攒钱买车，却三次被命运无情地剥夺。小说生动描绘了二十世纪初北京底层人民的艰辛生活，展示了一个善良纯朴的灵魂是如何在残酷的社会现实中一步步走向堕落的过程，是中国现代文学的经典之作。',
  '个人的努力固然重要，但社会环境对人的命运有着深远的影响。我们应当追求公平正义的社会，让每个人都能通过努力获得应有的回报。',
  '978-7-02-006803-2'
),
(
  '城南旧事',
  '林海音',
  '三联书店',
  2015, 182, '自传小说', 'Cina',
  '这是一部充满童真的自传体小说，以小女孩英子的视角，描述了二十世纪二十年代北京城南的生活百态。英子先后结识了疯女秀贞、小偷、奶妈宋妈等形形色色的人物，在她童稚的眼中，这些人都有着各自的悲欢离合。小说文笔清新优美，充满对故乡和童年的深情回忆，读来令人感动，是华人世界广泛阅读的经典作品。',
  '童年是人生中最纯真美好的时光。我们应当珍惜身边的每一个人，用善良和理解去对待那些处于困境中的人。',
  '978-7-108-02345-6'
),
(
  '小王子',
  '安托万·德·圣埃克苏佩里',
  '人民文学出版社',
  2014, 96, '寓言故事', 'Cina',
  '一位飞行员在撒哈拉沙漠迫降，遇见了来自另一个星球的小王子。小王子讲述了他游历各个星球的奇特经历，遇到了国王、虚荣的人、商人、点灯人等各种人物。这个看似简单的童话故事，实则蕴含着对生命、爱情、友谊和人生意义的深刻思考。小王子那句"用心才能看清事物，真正重要的东西用眼睛是看不见的"成为了千古名言。',
  '真正重要的东西用肉眼是看不见的，只有用心才能感受。我们不应该被物质和表象所迷惑，要用真心去体会生命中真正珍贵的东西。',
  '978-7-02-008753-8'
),

-- ==================== TAMIL (3) ====================
(
  'பொன்னியின் செல்வன்',
  'கல்கி கிருஷ்ணமூர்த்தி',
  'கல்கி பதிப்பகம்',
  2018, 368, 'வரலாற்று நாவல்', 'Tamil',
  'இந்த நாவல் சோழ பேரரசின் பொற்காலத்தை சித்தரிக்கிறது. இளவரசர் அருண்மொழிவர்மன் (பின்னாளில் ராஜராஜ சோழன்) தனது தந்தை சுந்தர சோழரின் உண்மையான கொலையாளியை கண்டுபிடிக்க முயற்சிக்கிறார். நட்பு, காதல், விசுவாசம், துரோகம் என பல்வேறு உணர்வுகளை ஆழமாக சித்தரிக்கும் இந்த நாவல், தமிழ் இலக்கியத்தின் மகுடமணியாக கருதப்படுகிறது. வீரம், தியாகம் மற்றும் நேர்மையின் மதிப்பை வலியுறுத்துகிறது.',
  'நட்பு மற்றும் விசுவாசம் வாழ்வில் மிக முக்கியமானவை. நீதி நிலைநாட்டுவதற்காக எந்த சவாலையும் எதிர்கொள்ள தயாராக இருக்க வேண்டும்.',
  '978-81-7374-567-8'
),
(
  'அகல்யா',
  'சு. சமுத்திரம்',
  'மணிவாசகர் பதிப்பகம்',
  2017, 215, 'சமூக நாவல்', 'Tamil',
  'இந்த நாவல் ஒரு இளம் பெண்ணின் வாழ்க்கை போராட்டத்தை சித்தரிக்கிறது. அகல்யா என்ற பெண் சமூக தடைகளையும், குடும்ப அழுத்தங்களையும் தாண்டி தன் கனவை நனவாக்க போராடுகிறாள். கல்வி, சுதந்திரம் மற்றும் சுய மரியாதைக்காக அவள் நடத்தும் போராட்டம் வாசகர்களை ஆழமாக தொடுகிறது. பெண் கல்வியின் முக்கியத்துவம் மற்றும் சமூக நீதி பற்றிய ஆழமான கேள்விகளை எழுப்புகிறது.',
  'கல்வி மனிதனுக்கு சுதந்திரம் தரும் ஆயுதம். பெண்கள் தங்கள் உரிமைகளுக்காக போராட வேண்டும் மற்றும் சமூகம் அவர்களுக்கு சம வாய்ப்பு வழங்க வேண்டும்.',
  '978-81-8368-234-5'
),
(
  'சிவகாமியின் சபதம்',
  'கல்கி கிருஷ்ணமூர்த்தி',
  'கல்கி பதிப்பகம்',
  2016, 412, 'வரலாற்று நாவல்', 'Tamil',
  'இந்த நாவல் பல்லவ மற்றும் சாளுக்கிய பேரரசுகளுக்கிடையேயான போரை பின்னணியாக கொண்டது. நடன கலைஞையான சிவகாமி, அவளை நேசிக்கும் சிற்பி ஆயனர், மற்றும் பல்லவ இளவரசர் மாமல்லன் ஆகியோரின் கதை இதன் மையம். அரசியல் சூழ்ச்சிகள், காதல், போர், கலை மற்றும் தியாகம் என பல்வேறு கோணங்களில் விரியும் இந்த கதை, தமிழ் வரலாற்று இலக்கியத்தின் சிறந்த படைப்புகளில் ஒன்றாகும்.',
  'கலை மற்றும் அழகுணர்ச்சி மனித ஆன்மாவை உயர்த்துகின்றன. உண்மையான அன்பும் தியாகமும் எந்த சவாலையும் வெல்லும்.',
  '978-81-7374-678-9'
);
