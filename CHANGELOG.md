# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.18.0](https://github.com/The-Heidi-Suite/heidi.microservices/compare/v1.17.0...v1.18.0) (2025-11-17)


### 🐛 Bug Fixes

* **docker:** update healthcheck commands in docker-compose.yml for improved reliability ([26dea68](https://github.com/The-Heidi-Suite/heidi.microservices/commit/26dea68233d241582b8ebfe753249b342aa72d5c))
* **rabbitmq:** update integration sync listing constant for consistency ([bc209f1](https://github.com/The-Heidi-Suite/heidi.microservices/commit/bc209f1feb3dc5dccb06f704c7dbba5e25f058cc))


### 🔧 Chores

* **docker:** configure pgAdmin for reverse proxy support in docker-compose.yml and Caddyfile ([8f4109f](https://github.com/The-Heidi-Suite/heidi.microservices/commit/8f4109f9a6bd99beedced78412ce51148908fe6c))
* **docker:** refine volume configuration in docker-compose.yml ([1bc871e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/1bc871e6947892deacab195e37d70b30db5b448a))
* **docker:** update healthcheck command for Caddy service in docker-compose.yml ([9797a0d](https://github.com/The-Heidi-Suite/heidi.microservices/commit/9797a0d3ccfe5279d0938169fb8819420dc9d666))
* **docker:** update healthcheck command for redis service in docker-compose.yml ([223de35](https://github.com/The-Heidi-Suite/heidi.microservices/commit/223de35ff89d77ffc28d10bd8310a190ca3e3fd9))
* **docker:** update pgAdmin volume configuration in docker-compose.yml ([de3612b](https://github.com/The-Heidi-Suite/heidi.microservices/commit/de3612b742cae8c6bfa8f9ce771ed816437b1563))


### ♻️ Code Refactoring

* **categories:** clean up API operation descriptions and streamline imports ([a621ddb](https://github.com/The-Heidi-Suite/heidi.microservices/commit/a621ddb19add6f4e1361ea40c904078424e931cd))
* **config:** streamline KielNewsletter configuration retrieval ([5a3984b](https://github.com/The-Heidi-Suite/heidi.microservices/commit/5a3984bcd7d68615fcf8cc60795c80feddd8b267))
* **docker:** remove permissions fix script from pgAdmin configuration in docker-compose.yml ([60d8d6f](https://github.com/The-Heidi-Suite/heidi.microservices/commit/60d8d6fa530d2c20ea71b977ce2dc1289a0083c3))


### ✨ Features

* **categories:** implement image and icon upload functionality for categories ([062832b](https://github.com/The-Heidi-Suite/heidi.microservices/commit/062832b6cd0209041b7d3ad22b9a40cdcaaead4f))
* **docker:** add permissions fix script for pgAdmin in docker-compose.yml ([d82ed22](https://github.com/The-Heidi-Suite/heidi.microservices/commit/d82ed22ce6bd0928d4524c614c795399c651afe8))
* **favorites:** implement toggle favorite functionality for listings ([670b06e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/670b06eab0cc4ebfafffc3a2b15c115ba5e7374c))
* **integration:** add Kiel Newsletter integration and subscription model ([63bc1cd](https://github.com/The-Heidi-Suite/heidi.microservices/commit/63bc1cd0eb0b9d302735c19973b32031bb92bcce))
* **integration:** add KielNewsletter module and service for newsletter subscriptions ([ca7187b](https://github.com/The-Heidi-Suite/heidi.microservices/commit/ca7187b4950236dfebd71db9b56ee39f05661a19))
* **integration:** add Mobilithek Parking integration seeding script and configuration ([ff6303d](https://github.com/The-Heidi-Suite/heidi.microservices/commit/ff6303de4fedd357b06090f09f77d8843ca20eb2))
* **integration:** add MobilithekParking module and service for parking data integration ([f39335e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/f39335e3039db6a6764a3cd691c03e5b3000d04b))
* **integration:** implement newsletter subscription endpoint and service integration ([c3457de](https://github.com/The-Heidi-Suite/heidi.microservices/commit/c3457de9005d56d800c45674bcf7718d32c178f5))
* **integration:** integrate JWT authentication and enhance access control ([d5baa5c](https://github.com/The-Heidi-Suite/heidi.microservices/commit/d5baa5c4533a09ac5afddcc47c4b4b4a45aee5c6))
* **listings:** enhance listing retrieval with user favorites ([11b67e9](https://github.com/The-Heidi-Suite/heidi.microservices/commit/11b67e910788be6f61cf2b5e93567f795fcd605b))
* **parking:** add ParkingSpace DTO and update integration exports ([e234200](https://github.com/The-Heidi-Suite/heidi.microservices/commit/e234200f88ef7dbf46f727219038dbed632c534e))
* **parking:** add ParkingSpace model and Mobilithek integration support ([c2e55ad](https://github.com/The-Heidi-Suite/heidi.microservices/commit/c2e55ad114b7420ea8e0030c4593cd9f2b72d5a3))
* **parking:** integrate parking space synchronization and retrieval ([a4f2634](https://github.com/The-Heidi-Suite/heidi.microservices/commit/a4f2634f5d3329893def4c5f6e6f6351902530a9))
* **seeding:** add city categories seeding script for Kiel ([aaf4966](https://github.com/The-Heidi-Suite/heidi.microservices/commit/aaf4966e8e97ee06d8813b25582857fccd9db105))
* **seeding:** add new seed scripts for Mobilithek Parking and Kiel Newsletter integrations ([c1cbe4e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/c1cbe4e914fcb8402a3ff8013f343f3f1c837d59))
* **seeding:** update seed scripts and improve environment variable loading ([9df26cf](https://github.com/The-Heidi-Suite/heidi.microservices/commit/9df26cf1d9f17c4a607ba31066b2732b44dc3fba))

## [1.17.0](https://github.com/The-Heidi-Suite/heidi.microservices/compare/v1.16.0...v1.17.0) (2025-11-16)


### ✨ Features

* **infrastructure:** implement data persistence and backup functionality ([fbce5d2](https://github.com/The-Heidi-Suite/heidi.microservices/commit/fbce5d2e0538730439ff717aec5bd499d33c3977))

## [1.16.0](https://github.com/The-Heidi-Suite/heidi.microservices/compare/v1.15.0...v1.16.0) (2025-11-16)


### 🔧 Chores

* **package-lock:** remove peer dependencies and update devOptional to dev for several packages ([e70707a](https://github.com/The-Heidi-Suite/heidi.microservices/commit/e70707a19c8e53be29e7e15604390b68a41a425f))
* **release:** 1.15.0 [skip ci] ([cf95160](https://github.com/The-Heidi-Suite/heidi.microservices/commit/cf95160c6fdcf2f694634bf80bed1c8bd4a411f6))


### 🐛 Bug Fixes

* **package:** update dev:all script to include integration service in concurrent development setup ([635ee0e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/635ee0ecfbaf2220f9b8035a76a49ba26adb9e66))


### ✨ Features

* **auth:** enhance login error handling with detailed responses ([1bf3abd](https://github.com/The-Heidi-Suite/heidi.microservices/commit/1bf3abd2a3a0cb9646cc10d00d47b603c44d12ca))
* **auth:** implement non-blocking terms acceptance check during login ([df220d6](https://github.com/The-Heidi-Suite/heidi.microservices/commit/df220d6334228a303958cd14ea261a5b1dcf77d7))
* **categories:** add updateDisplayName endpoint and enhance category assignment ([4cac83c](https://github.com/The-Heidi-Suite/heidi.microservices/commit/4cac83ccfde73c785ce9654c60f5106ecfdbc980))
* **categories:** add updateDisplayName endpoint and enhance category assignment ([0b2dc79](https://github.com/The-Heidi-Suite/heidi.microservices/commit/0b2dc79c6259829fff104f49c0bb41ed09f962a8))
* **categories:** enhance error handling and update category-related DTOs ([b998b27](https://github.com/The-Heidi-Suite/heidi.microservices/commit/b998b2733ffc50c5c3dd8048826d902f65cca026))
* **categories:** implement category retrieval and hierarchical structure ([631e177](https://github.com/The-Heidi-Suite/heidi.microservices/commit/631e17728895801bf8ae95d68af9a6ba678568bd))
* **categories:** implement category retrieval and hierarchical structure ([25d8cfa](https://github.com/The-Heidi-Suite/heidi.microservices/commit/25d8cfa65f304c89b0557df688a0d48ecc8b5d0c))
* **categories:** implement hierarchical category structure and enhance category retrieval ([3a91bf6](https://github.com/The-Heidi-Suite/heidi.microservices/commit/3a91bf6bca844d576f2d7871025debc0996a030d))
* **city:** add CityMessageController for handling city-related messages ([a812319](https://github.com/The-Heidi-Suite/heidi.microservices/commit/a812319fce29fd25345cfd985e473914b6d35b4a))
* **city:** add email theme metadata to Kiel city record ([3dec15a](https://github.com/The-Heidi-Suite/heidi.microservices/commit/3dec15a751af74272a1feba87ae7903cbd633ae2))
* **cityCategory:** add displayName field to CityCategory model and update migration ([f7771b9](https://github.com/The-Heidi-Suite/heidi.microservices/commit/f7771b95c3d40b4adf90a70d6150193ba1e5dc17))
* **city:** enhance city module with Swagger documentation and new features ([10fe847](https://github.com/The-Heidi-Suite/heidi.microservices/commit/10fe847f6d0beb94ce7ccf30c84da2d9862033cc))
* **city:** refactor city DTOs and introduce new response structures ([a5c434d](https://github.com/The-Heidi-Suite/heidi.microservices/commit/a5c434db4362826d07eee6144e3bf3aeb42bc67d))
* **dependencies:** update file-type package and add new dependencies ([ca352ea](https://github.com/The-Heidi-Suite/heidi.microservices/commit/ca352ea60f3b023f1bf79f7ae2f4ad6b38210720))
* **dto:** add new integration response DTOs and update exports ([6e9c74e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/6e9c74e088500289220abf33f7e1b2c0e92a972a))
* **dtos:** add new response DTOs for media uploads ([e71c9b0](https://github.com/The-Heidi-Suite/heidi.microservices/commit/e71c9b08e449535314ecd20ee086a360f18a84ea))
* **dto:** update integration DTOs and restructure exports ([5488fab](https://github.com/The-Heidi-Suite/heidi.microservices/commit/5488fab772fef06b93ad0f18ffda460b9afd8f94))
* **i18n:** add new error messages for account management across multiple languages ([1da4b61](https://github.com/The-Heidi-Suite/heidi.microservices/commit/1da4b61cdb2c21a7ae08836702d6f90d9f260d2e))
* **i18n:** add new tile-related error messages in multiple languages ([61d687c](https://github.com/The-Heidi-Suite/heidi.microservices/commit/61d687ce141500a6686707e7206e7b3dd8880738))
* **i18n:** update email verification subjects to include app name ([c30e1f4](https://github.com/The-Heidi-Suite/heidi.microservices/commit/c30e1f46a776a1de97d002a8614fff8c5e23ba18))
* **integration:** add DESTINATION_ONE to IntegrationProvider enum and update migration ([5887691](https://github.com/The-Heidi-Suite/heidi.microservices/commit/58876916de10910a8fc3bdd8efd22b07faac7523))
* **integration:** add DestinationOne module and service for API integration ([2bc4340](https://github.com/The-Heidi-Suite/heidi.microservices/commit/2bc4340bc5335e3a23a10ac63abb561adb538c69))
* **integration:** add seeding script for Destination One integration ([046bb8b](https://github.com/The-Heidi-Suite/heidi.microservices/commit/046bb8b50c5d165221c5a5fa05cc7bd06ced78eb))
* **integration:** enhance main application setup and add Swagger documentation ([55b1bfd](https://github.com/The-Heidi-Suite/heidi.microservices/commit/55b1bfdf6eb3fbeea2a989bf78bf6f6791d42349))
* **integration:** implement DestinationOne service and update integration module ([a638787](https://github.com/The-Heidi-Suite/heidi.microservices/commit/a63878715a185be7e15268741759751a987616fa))
* **integration:** implement paginated data fetching for Destination One service ([cf991af](https://github.com/The-Heidi-Suite/heidi.microservices/commit/cf991af2f940a55d9697305efff171c78c8ff5ee))
* **integration:** implement syncListingFromIntegration method and update CoreMessageController ([25b683f](https://github.com/The-Heidi-Suite/heidi.microservices/commit/25b683fc284cd335a61a29ff38ae92d03d6a1dfc))
* **listings:** add DeleteMediaResponseDto and update index file ([d05f99e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/d05f99e6132e0b37ab5c79436d5b28b53399fdba))
* **listings:** enhance listing creation and update DTOs with new structures and validations ([d5baaed](https://github.com/The-Heidi-Suite/heidi.microservices/commit/d5baaed7268237be8e347fb2d4c65b631dfa5419))
* **listings:** implement media deletion functionality in ListingController and ListingsService ([a0d120a](https://github.com/The-Heidi-Suite/heidi.microservices/commit/a0d120adbb603ed72d8e9ca722c04dc4232e057d))
* **listings:** implement media upload functionality in ListingController ([f0b31c5](https://github.com/The-Heidi-Suite/heidi.microservices/commit/f0b31c53cc45eaa6847708fe4239644562463430))
* **migrations:** add initial migration for tiles and tile_cities tables ([1872bdb](https://github.com/The-Heidi-Suite/heidi.microservices/commit/1872bdbea56ffc2da2d150ca9f7d21339a751b88))
* **notification:** add cityId support and CityEmailThemeService for email customization ([919fd34](https://github.com/The-Heidi-Suite/heidi.microservices/commit/919fd343785e28ff0ed65e1087cc2caebf24eb98))
* **notification:** add default email theme configuration ([849f7ff](https://github.com/The-Heidi-Suite/heidi.microservices/commit/849f7ffac87f58e5ca5aacab87dfcfe9853e27e3))
* **notification:** add SendNotificationDto for structured notification data ([34f9f53](https://github.com/The-Heidi-Suite/heidi.microservices/commit/34f9f5349a57a9d6cc7db4e54f6812944b8ed4a6))
* **notification:** enhance email verification with city-themed customization ([89ec872](https://github.com/The-Heidi-Suite/heidi.microservices/commit/89ec8723fd226680b48b9115ef324957943c0c65))
* **password-reset:** add password reset functionality with request and confirmation endpoints ([4258989](https://github.com/The-Heidi-Suite/heidi.microservices/commit/42589893cb8f18ebdfd15c330d5bbaff6d5c94d9))
* **password-reset:** add password reset functionality with request and confirmation endpoints ([f1fc446](https://github.com/The-Heidi-Suite/heidi.microservices/commit/f1fc446888e0f9605e1217f8cde387b792cc181b))
* **password-reset:** implement password reset configuration and localization support ([83cae22](https://github.com/The-Heidi-Suite/heidi.microservices/commit/83cae229126a236d3a35a5db69676598369f4842))
* **password-reset:** implement password reset configuration and localization support ([76ee6a2](https://github.com/The-Heidi-Suite/heidi.microservices/commit/76ee6a2b1631587811241985ea60142c8a3d1641))
* **password-reset:** implement password reset module with email functionality ([b451459](https://github.com/The-Heidi-Suite/heidi.microservices/commit/b45145990103c3641804bcba5c08008930ea121e))
* **password-reset:** implement password reset module with email functionality ([a17b9cb](https://github.com/The-Heidi-Suite/heidi.microservices/commit/a17b9cb77925f37a0e60599baf5194633e77228c))
* **rbac:** add role utility functions and update guards to handle numeric user roles ([1ab0ffa](https://github.com/The-Heidi-Suite/heidi.microservices/commit/1ab0ffadbc5a924034b8ac60a7b8ceaf130db0dc))
* **storage:** add AWS SDK for S3 and update storage configuration ([27a876a](https://github.com/The-Heidi-Suite/heidi.microservices/commit/27a876a4ddc24a2debc2436cfd633ffff4656f14))
* **storage:** add Hetzner Object Storage configuration ([9e7ac54](https://github.com/The-Heidi-Suite/heidi.microservices/commit/9e7ac54b0bf7104b39b7c3a66ba437111671c877))
* **storage:** implement file upload service for image, video, document, and audio processing ([a67f2a6](https://github.com/The-Heidi-Suite/heidi.microservices/commit/a67f2a6c7b251ae0c72419fdf33daa6e0ce866cf))
* **storage:** implement Storage module and service for Hetzner Object Storage ([84d8d2c](https://github.com/The-Heidi-Suite/heidi.microservices/commit/84d8d2ce04fada156b328b5c395fe976d0ed2b63))
* **tasks:** enhance task execution logic to support integration sync ([bc81cb7](https://github.com/The-Heidi-Suite/heidi.microservices/commit/bc81cb7b5e36d48e8d370ae8329c795222817db9))
* **terms:** update guest user terms acceptance handling ([9bda015](https://github.com/The-Heidi-Suite/heidi.microservices/commit/9bda015363473df1f7add9c20bb46ca8ed36ea49))
* **terms:** update guest user terms acceptance handling ([c090aea](https://github.com/The-Heidi-Suite/heidi.microservices/commit/c090aea33b8c97080d452ecc61dbfa4eec363ab1))
* **tile:** add Tile and TileCity models with permissions for ad management ([12a55c6](https://github.com/The-Heidi-Suite/heidi.microservices/commit/12a55c6b24b0db0d120cef28bc18ef65c463c71d))
* **tile:** add tile-related DTOs for managing tiles and their associations ([23b9f3e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/23b9f3ee448f16a799279f0002532d4fd0123459))
* **tile:** implement Tiles module with controller and service for tile management ([b4e9ffd](https://github.com/The-Heidi-Suite/heidi.microservices/commit/b4e9ffde62aff1cf1d70e6edb2d4c0a9e002bdb1))
* **tiles:** add background image upload functionality to TilesController ([85fe8d0](https://github.com/The-Heidi-Suite/heidi.microservices/commit/85fe8d0f7bda75dc1dd8efcec521eac6c4c25a9e))
* **tiles:** add icon image upload functionality for tiles ([085658a](https://github.com/The-Heidi-Suite/heidi.microservices/commit/085658a616b42cc0d960dd2f774e5ad95f61585e))
* **tiles:** add icon image upload functionality for tiles ([c152161](https://github.com/The-Heidi-Suite/heidi.microservices/commit/c152161c84800ec2cac2b768d352ae3aad30b780))
* **tiles:** add new response DTOs for tile operations and error handling ([4724798](https://github.com/The-Heidi-Suite/heidi.microservices/commit/47247989ebfeb164f8c0850ef595f0dd9203dca1))
* **tiles:** add search filter for tiles by header, subheader, and description ([4e436ed](https://github.com/The-Heidi-Suite/heidi.microservices/commit/4e436ed28c5b94c14241c686142de09d57a3ded6))
* **tiles:** add search filter for tiles by header, subheader, and description ([37de5ab](https://github.com/The-Heidi-Suite/heidi.microservices/commit/37de5ab465168c3cf11017a54572ef3b81f6e0e4))
* **tiles:** enhance background image upload and management ([2b28a00](https://github.com/The-Heidi-Suite/heidi.microservices/commit/2b28a0053903b24df65bee37a084ebe224acf532))
* **tiles:** enhance tile creation and update DTOs with new city reference structure ([566ecd1](https://github.com/The-Heidi-Suite/heidi.microservices/commit/566ecd1ac3b18f62e2b2f2e9a78bc88cd4cf3265))
* **tiles:** update response DTOs and refactor controller methods ([ba5b6b6](https://github.com/The-Heidi-Suite/heidi.microservices/commit/ba5b6b65083cbe57633ef9bd139a40f9611540d0))
* **users:** add profilePhotoUrl column to users table ([4179b7c](https://github.com/The-Heidi-Suite/heidi.microservices/commit/4179b7cd12e4d92d4b1fb4dc530f954f3d4eb760))
* **users:** convert user roles to numeric values in user retrieval methods ([4581e3e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/4581e3efb0fb3597bef20b9dfd0d7b7c3cf14d8d))
* **users:** convert user roles to numeric values in user retrieval methods ([7dc19b1](https://github.com/The-Heidi-Suite/heidi.microservices/commit/7dc19b14492f27bfdfdd3ff1f53ee83ba3416cf8))
* **users:** enhance profile photo upload and response structure ([5744e05](https://github.com/The-Heidi-Suite/heidi.microservices/commit/5744e05dee65c1ff669947c8fc5f6b7564bafbda))
* **users:** filter user retrieval by userType in UsersService ([95911a0](https://github.com/The-Heidi-Suite/heidi.microservices/commit/95911a07f16c7bdfa0056700353caa69ed8a2e95))
* **users:** filter user retrieval by userType in UsersService ([06cd9f3](https://github.com/The-Heidi-Suite/heidi.microservices/commit/06cd9f394024f5d8eddde87973395a4736045dda))
* **users:** implement profile photo upload functionality ([d12317f](https://github.com/The-Heidi-Suite/heidi.microservices/commit/d12317f506914f68b5b81f5ef9c19dba7ad1d872))
* **users:** include cityId in user data handling ([6cfb772](https://github.com/The-Heidi-Suite/heidi.microservices/commit/6cfb772ffccc664123d59c1f8c1d74136c3c20b3))


### ♻️ Code Refactoring

* **auth, users, listings, tiles:** standardize role handling to numeric values ([ed4eaf9](https://github.com/The-Heidi-Suite/heidi.microservices/commit/ed4eaf924e90baa82da506aeb1b1b71b758494ea))
* **categories:** simplify category hierarchy building and remove unused methods ([84cf589](https://github.com/The-Heidi-Suite/heidi.microservices/commit/84cf5897fb4fbc9a1ee52a0c5d63f5340c5e6bdf))
* **categories:** streamline error message formatting in CategoriesController ([e664038](https://github.com/The-Heidi-Suite/heidi.microservices/commit/e6640381e9119a71972a54a953b5ecac60964b99))
* **dtos:** improve formatting and organization in tile DTOs ([57448bf](https://github.com/The-Heidi-Suite/heidi.microservices/commit/57448bf6147f0f293f9efabcb318655619034a37))
* **dtos:** standardize ApiProperty formatting and enhance documentation ([9d8ad7f](https://github.com/The-Heidi-Suite/heidi.microservices/commit/9d8ad7f16d91d93bbe4ae5bc7517acb0cfa88499))
* **dto:** update user role representation to numeric values for consistency ([e81c26c](https://github.com/The-Heidi-Suite/heidi.microservices/commit/e81c26c024c8ebd497b77b3c8ef35c383fbc0ee8))
* **errors:** format translation calls for improved readability ([84760ca](https://github.com/The-Heidi-Suite/heidi.microservices/commit/84760ca3489fcfe1704b435fe2b8bedc7a8a2abc))
* **favorites:** streamline error message formatting in FavoritesController ([f2920d2](https://github.com/The-Heidi-Suite/heidi.microservices/commit/f2920d2b328e761d9a924dcc8101655f8f9ac08e))
* **integration:** remove DestinationOne service and update integration logic ([ee4c68a](https://github.com/The-Heidi-Suite/heidi.microservices/commit/ee4c68abe4d7bba49e699f850410d5dc87dcef15))
* **jwt:** update role handling to use numeric values for improved consistency ([b1b278d](https://github.com/The-Heidi-Suite/heidi.microservices/commit/b1b278d4fd13f7817577c84080712511b208c526))
* **notification:** clean up code formatting and improve readability ([a4c0b12](https://github.com/The-Heidi-Suite/heidi.microservices/commit/a4c0b1273476555c0883a6f82efbed230c820f92))
* **notification:** migrate SendNotificationDto to shared contracts and remove local DTO files ([5fe83fd](https://github.com/The-Heidi-Suite/heidi.microservices/commit/5fe83fdcfe513f0a7c5c806d577bab360d785e37))
* **tiles:** remove backgroundImageUrl from CreateTileDto and UpdateTileDto ([0a0ebba](https://github.com/The-Heidi-Suite/heidi.microservices/commit/0a0ebbaa6795dc3a55d71945c1970e26fc43ecab))
* **tiles:** simplify user ID retrieval and streamline error message formatting ([82510ae](https://github.com/The-Heidi-Suite/heidi.microservices/commit/82510ae2957733edf5a4678cf98189d8e6b2ae81))

## [1.15.0](https://github.com/The-Heidi-Suite/heidi.microservices/compare/v1.14.0...v1.15.0) (2025-11-12)


### 🔧 Chores

* remove PM2 ecosystem configuration and related scripts from package.json ([7a17fbd](https://github.com/The-Heidi-Suite/heidi.microservices/commit/7a17fbd639b29f86a48791cbe4d242040a66475c))
* remove PM2 ecosystem configuration and related scripts from package.json ([bf04038](https://github.com/The-Heidi-Suite/heidi.microservices/commit/bf0403881948fb9818f49981a3e25792fe17ebd8))


### ✨ Features

* **auth:** simplify login process to email-only authentication ([7abcee5](https://github.com/The-Heidi-Suite/heidi.microservices/commit/7abcee53de9efe2fe865a36368b0ba2221852218))
* **caddy:** add React frontend support and update environment variables ([ca607b7](https://github.com/The-Heidi-Suite/heidi.microservices/commit/ca607b77d7151dbaa3f822f72c45deba99fc1591))
* **categories:** enhance CategoriesController and CategoriesService with city-specific category management ([db6e6d4](https://github.com/The-Heidi-Suite/heidi.microservices/commit/db6e6d4508d0c70020dbe3b51188cfae81b2849d))
* **categories:** enhance CategoriesController and CategoriesService with improved API documentation and request handling ([45a7f87](https://github.com/The-Heidi-Suite/heidi.microservices/commit/45a7f871b25e72e2d959d0681d0c8e6524987e82))
* **categories:** implement Categories module with CRUD operations and admin access control ([556438b](https://github.com/The-Heidi-Suite/heidi.microservices/commit/556438b043fcadcbe163fc50ee213581f655128d))
* **categories:** integrate RBAC and JWT for enhanced access control in CategoriesController ([d7c87a2](https://github.com/The-Heidi-Suite/heidi.microservices/commit/d7c87a2b8f26519b95bef1c076d1470dee8524ea))
* **categories:** update error handling and enhance app module with new interceptors ([f1b2368](https://github.com/The-Heidi-Suite/heidi.microservices/commit/f1b236805348c202840ae859c06703db7af2f953))
* **core:** enhance CoreController and CoreService with detailed API documentation and DTO integration ([8f15d7a](https://github.com/The-Heidi-Suite/heidi.microservices/commit/8f15d7add6847846938383d51e4973c661066bc4))
* **core:** integrate Listings and Categories modules, enhance Swagger documentation ([f28eb01](https://github.com/The-Heidi-Suite/heidi.microservices/commit/f28eb01319ae6e53b2d242634d69d9e94e620e0a))
* **docker:** add Windows-specific Dockerfile for NestJS microservices (for development only) and enhance i18n service translation path handling ([aa9f428](https://github.com/The-Heidi-Suite/heidi.microservices/commit/aa9f428de0a40b8ba19d6401987c5a262fa6ed84))
* **docker:** add Windows-specific Dockerfile for NestJS microservices (for development only) and enhance i18n service translation path handling ([96ed65f](https://github.com/The-Heidi-Suite/heidi.microservices/commit/96ed65fe7354a87181ff1f29513cc3514b2a1322))
* **dto:** add core and category response DTOs for enhanced data handling ([9989b68](https://github.com/The-Heidi-Suite/heidi.microservices/commit/9989b685fc0d8df8e039450dbe986016e6a90a08))
* **errors:** add new error codes for verification and category-related issues ([899cd55](https://github.com/The-Heidi-Suite/heidi.microservices/commit/899cd551b7c7396c66a4643ae2f193f55609ef0e))
* **i18n:** add email verification translations and enhance error messages ([84681cb](https://github.com/The-Heidi-Suite/heidi.microservices/commit/84681cb4fbe8d1abd79334e29b2006c94a0739d7))
* **i18n:** add language support to user registration and creation ([59689d4](https://github.com/The-Heidi-Suite/heidi.microservices/commit/59689d46740d5008056c1a7d1f703b89ce2d7e34))
* **i18n:** enhance verification process with language support ([1069147](https://github.com/The-Heidi-Suite/heidi.microservices/commit/106914755fab1e7338ba09695dbe57936efc0e8c))
* **jwt:** enhance JWT module and strategy with forward reference for RBAC and Permission services ([5040b8a](https://github.com/The-Heidi-Suite/heidi.microservices/commit/5040b8a50cbe06027644dde54305ba756bf353b7))
* **listings:** enhance FavoritesController and ListingController with detailed API documentation and DTO integration ([c67ec0a](https://github.com/The-Heidi-Suite/heidi.microservices/commit/c67ec0aa0c52ea2de5261250c3aec44c6b5980da))
* **listings:** implement Favorites and Listings controllers with CRUD operations ([ada7d55](https://github.com/The-Heidi-Suite/heidi.microservices/commit/ada7d554e6a46e14ab3b68993755a54c793eedb2))
* **listings:** introduce DTOs for listing management ([edf483b](https://github.com/The-Heidi-Suite/heidi.microservices/commit/edf483b70556e833674a118dcc90bb2558c23984))
* **migrations:** add initial migration for city categories and category requests ([87809e7](https://github.com/The-Heidi-Suite/heidi.microservices/commit/87809e7a76b20f66ad51810ad6c0ae8927a1f986))
* **notification:** enhance notification module with error handling and new interceptors ([ee97ae5](https://github.com/The-Heidi-Suite/heidi.microservices/commit/ee97ae53e4509726b9f3185834b640bceb9473c3))
* **permissions:** expand permissions for city categories and category requests ([efca929](https://github.com/The-Heidi-Suite/heidi.microservices/commit/efca929a2cd66cd2ad14165a76b8af157b448e79))
* **prisma:** add CityCategory and CategoryRequest models to schema ([64861ff](https://github.com/The-Heidi-Suite/heidi.microservices/commit/64861ff9f8f1a4a0d1effcae96ae08797d691a98))
* **prisma:** enhance Listing model and introduce new related models ([7ff6ce5](https://github.com/The-Heidi-Suite/heidi.microservices/commit/7ff6ce5680c1a63b29b4c69e4bf4b429c6c269d7))
* **seeding:** add category and initial admin seeding scripts ([4b6b0d3](https://github.com/The-Heidi-Suite/heidi.microservices/commit/4b6b0d343cbf065dce10ce094f3554c984db3ff6))
* **users:** update user registration and conversion to allow optional username and name fields ([4c41024](https://github.com/The-Heidi-Suite/heidi.microservices/commit/4c41024c7b561cb69318f70cc52147c9a07213b7))
* **validation:** enhance error handling and validation messages across user registration and conversion ([3df5248](https://github.com/The-Heidi-Suite/heidi.microservices/commit/3df524818ee2001c967fd39b60899a384f05cf8e))


### 🐛 Bug Fixes

* **i18n:** update registration error messages to require only email and password ([4a9c8b6](https://github.com/The-Heidi-Suite/heidi.microservices/commit/4a9c8b6e004a8b5bf03727e82144da954d535743))


### ♻️ Code Refactoring

* **auth:** update DTOs for guest conversion and registration ([22572aa](https://github.com/The-Heidi-Suite/heidi.microservices/commit/22572aabb1ead55661d408b42a0664fd62a99841))
* **core:** simplify CoreController and CoreService by removing favorite management methods ([a6f3ac5](https://github.com/The-Heidi-Suite/heidi.microservices/commit/a6f3ac5a8b358f611418715ab608219abbfab725))
* **errors:** format translation calls for improved readability ([8dc22a2](https://github.com/The-Heidi-Suite/heidi.microservices/commit/8dc22a23d15ecd5dd50d177163dd519b9698d5c6))
* **prisma:** remove database connection logging for security ([7d74577](https://github.com/The-Heidi-Suite/heidi.microservices/commit/7d74577b64c372ac4cc99439a4c93c72c7f9ffae))

## [1.14.0](https://github.com/The-Heidi-Suite/heidi.microservices/compare/v1.13.0...v1.14.0) (2025-11-07)


### 🔧 Chores

* **dependencies:** migrate from Yarn to npm and update package configurations ([bb0ff84](https://github.com/The-Heidi-Suite/heidi.microservices/commit/bb0ff84797571217829c4487fa2958f5def100bc))
* **dependencies:** update package-lock.json and yarn.lock for version bump and dependency adjustments ([5d66d0d](https://github.com/The-Heidi-Suite/heidi.microservices/commit/5d66d0defebb79418a2aaa0cc30a119c56cabcbc))
* **dependencies:** update package-lock.json and yarn.lock to remove peer dependencies and adjust dev flags ([3d5bdd6](https://github.com/The-Heidi-Suite/heidi.microservices/commit/3d5bdd6516ade9524546fb8b12d796c716b6c6c3))
* **dependencies:** update package-lock.json to remove peer flags and adjust dev flags ([c1ed350](https://github.com/The-Heidi-Suite/heidi.microservices/commit/c1ed35013fe14b60e94ac924033324bd635de988))
* **dependencies:** update yarn.lock and enhance error handling in global exception filter ([eac62d9](https://github.com/The-Heidi-Suite/heidi.microservices/commit/eac62d959b52c3a8658d7fab4524621ed20e2cb1))
* **dependencies:** update yarn.lock to reflect dependency changes and optimizations ([d134440](https://github.com/The-Heidi-Suite/heidi.microservices/commit/d1344405d4dd763b565e968f841d7265edacac52))


### 🐛 Bug Fixes

* **swagger:** enhance request interceptor for Accept-Language header handling ([aaa78c0](https://github.com/The-Heidi-Suite/heidi.microservices/commit/aaa78c0e07d8bb92f7ce9161fcf6d3d4771c9e51))
* **swagger:** improve LiveResponse component and response handling ([0e1e524](https://github.com/The-Heidi-Suite/heidi.microservices/commit/0e1e52446a2b2fae97c26bd666e22b561c6f2b0b))
* **swagger:** patch LiveResponse component and enhance response interceptor ([75d46ea](https://github.com/The-Heidi-Suite/heidi.microservices/commit/75d46ea8cdac7910e9e37b23189bff7dd308ff11))
* **swagger:** temporarily disable i18n options in Swagger setup ([69269f2](https://github.com/The-Heidi-Suite/heidi.microservices/commit/69269f2427bf232477a1d664710e2cf34da13dd4))


### ✨ Features

* **auth:** enhance API response documentation and error handling ([2ab0598](https://github.com/The-Heidi-Suite/heidi.microservices/commit/2ab0598da2fa3595675e2da5c68f5ce1601ac42c))
* **auth:** enhance login functionality with remember me option ([aafad13](https://github.com/The-Heidi-Suite/heidi.microservices/commit/aafad13c423fe89c86527927df42da26952808ba))
* **auth:** enhance login process with email verification handling ([7dc288c](https://github.com/The-Heidi-Suite/heidi.microservices/commit/7dc288c081bd859e556ccc843f3a6be4e5c6d042))
* **auth:** implement non-blocking terms acceptance check during login ([021f692](https://github.com/The-Heidi-Suite/heidi.microservices/commit/021f6929edb27f08a3b693d3e263fa2c6fe515f6))
* **auth:** improve email verification handling and error logging during login ([5181410](https://github.com/The-Heidi-Suite/heidi.microservices/commit/51814108e0b8483be0a42d3c0414c4c841b328b3))
* **config:** add API Gateway Base URL configuration and update email verification strategy ([8fce638](https://github.com/The-Heidi-Suite/heidi.microservices/commit/8fce63800b8319c94e2803ff8a87a939ec3ef31f))
* **i18n:** add success messages and email verification error handling ([dc9f03d](https://github.com/The-Heidi-Suite/heidi.microservices/commit/dc9f03d91b160e1e004511f8349f62acf91a6e30))
* **interceptors:** add SuccessMessageService and success message decorator ([7afd63f](https://github.com/The-Heidi-Suite/heidi.microservices/commit/7afd63feb1d7612e459b6e21f1a6a5cb239c4fbe))
* **notification:** enhance verification endpoints and integrate Swagger documentation ([efc86ac](https://github.com/The-Heidi-Suite/heidi.microservices/commit/efc86ac43a07d99709b344d5525b14e53aafd421))
* **security:** enhance helmet configuration and integrate i18n options for Swagger UI ([a2affd4](https://github.com/The-Heidi-Suite/heidi.microservices/commit/a2affd45bbddee6369ea2333b87de01476368532))
* **swagger-i18n:** implement dynamic language selector for Swagger UI ([29d1a46](https://github.com/The-Heidi-Suite/heidi.microservices/commit/29d1a46ee32b277df457463eb9cc72c533022b43))
* **terms:** add seeding scripts for terms of use and permissions ([44da0ff](https://github.com/The-Heidi-Suite/heidi.microservices/commit/44da0ff9a9ff0aa75b9beb3c365542925adde4c3))
* **terms:** add terms management DTOs and update login response ([17aaa86](https://github.com/The-Heidi-Suite/heidi.microservices/commit/17aaa863e347a6ac731d8af7d0c25a893ff885d9))
* **terms:** add terms of use configuration and i18n support for Swagger UI ([4023723](https://github.com/The-Heidi-Suite/heidi.microservices/commit/402372333b21d2f02ed5958f812a00e783b6cef3))
* **terms:** add TermsOfUse and UserTermsAcceptance models for terms management ([a24a226](https://github.com/The-Heidi-Suite/heidi.microservices/commit/a24a226da1f74d8209e056e858e74a81d6c58aaf))
* **terms:** implement terms acceptance guard and related decorators ([86eb01e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/86eb01ed364dfc6dbb407e9e14fb41eb09bf8030))
* **terms:** implement terms management module with controllers and service ([cdc3b46](https://github.com/The-Heidi-Suite/heidi.microservices/commit/cdc3b460d4aef4c8fe0e5cd405d696d66e35f2fe))
* **terms:** integrate TermsAcceptanceGuard across multiple modules ([71b6472](https://github.com/The-Heidi-Suite/heidi.microservices/commit/71b647220e94600f8fa78d029f479a2f62a5b169))
* **users:** add SuccessMessageService to app module ([2a9d8d2](https://github.com/The-Heidi-Suite/heidi.microservices/commit/2a9d8d2f65402a0c31688d939e8669a2eb750453))
* **verification:** add verification DTOs and enhance response structures ([8db88f8](https://github.com/The-Heidi-Suite/heidi.microservices/commit/8db88f89d7e9ea1dd7fb772e04467d50d3ae7ef0))


### ♻️ Code Refactoring

* **dto:** improve API property documentation formatting ([f0bb3bc](https://github.com/The-Heidi-Suite/heidi.microservices/commit/f0bb3bc6f1f302a6b90fd1501955910b9f421017))
* **terms:** simplify terms controller responses and enhance response DTOs ([df47e85](https://github.com/The-Heidi-Suite/heidi.microservices/commit/df47e8533601f67301b6639c1056079f1ead5bd3))
* **terms:** update acceptance status endpoint to require authentication ([6326d50](https://github.com/The-Heidi-Suite/heidi.microservices/commit/6326d50614949c4aa9838c4e9e66f47adf3ca9ca))
* **terms:** update terms controller and response DTOs for improved validation handling ([1e090a2](https://github.com/The-Heidi-Suite/heidi.microservices/commit/1e090a22e7689e3cc81c0f3031cb025dd99abe63))
* **users:** update message handling to event handling for verification ([5613c96](https://github.com/The-Heidi-Suite/heidi.microservices/commit/5613c961f9e6150932b96ceb7e867ad83e492187))

## [1.13.0](https://github.com/The-Heidi-Suite/heidi.microservices/compare/v1.12.0...v1.13.0) (2025-11-06)


### ♻️ Code Refactoring

* **dto:** remove common exports and delete common index file ([eae4abc](https://github.com/The-Heidi-Suite/heidi.microservices/commit/eae4abc6dd3b935de6a56110372fcfda6b391e30))
* **rabbitmq:** remove definitions.json and update documentation ([17f38fe](https://github.com/The-Heidi-Suite/heidi.microservices/commit/17f38fec063dc19431eb98262f68707e15f82b10))


### ✨ Features

* **auth, users:** enhance user and session models with device tracking and favorites ([70bcf38](https://github.com/The-Heidi-Suite/heidi.microservices/commit/70bcf387f36af6a919b184adc01159ef63c0e1c1))
* **auth:** add email verification check during login process ([682b5dd](https://github.com/The-Heidi-Suite/heidi.microservices/commit/682b5ddf7c227f2dccdc74d238e0358702858b1d))
* **auth:** add guest conversion and login DTOs for improved user management ([d54b1c6](https://github.com/The-Heidi-Suite/heidi.microservices/commit/d54b1c6cebbcb8191b00a285a5a1b940d477fb2d))
* **auth:** implement guest session creation and conversion endpoints ([c6d2b83](https://github.com/The-Heidi-Suite/heidi.microservices/commit/c6d2b832fb48f4c7cce995ac3d1ae48b1b52a921))
* **core:** implement favorites management for users ([83bdd77](https://github.com/The-Heidi-Suite/heidi.microservices/commit/83bdd77fbc5a02c2e0506bdf03d3e1aaa4a37368))
* **email:** enhance SMTP configuration and email service ([d546579](https://github.com/The-Heidi-Suite/heidi.microservices/commit/d546579b7ece68f7c85e723ed8b3e2bc48ab98e9))
* **notification:** add DTOs for verification processes ([66a6c47](https://github.com/The-Heidi-Suite/heidi.microservices/commit/66a6c47e2d68e1c9317bc4429507803e0734e503))
* **notification:** add VerificationToken model and related enums for email/SMS verification ([387c04b](https://github.com/The-Heidi-Suite/heidi.microservices/commit/387c04b92f116c3686107c1e39b1b9b4a0086e2d))
* **notification:** implement email service and notification message controller ([83186f8](https://github.com/The-Heidi-Suite/heidi.microservices/commit/83186f8c544bb8f2ccb1dc25c57db2af6ed3098f))
* **rabbitmq:** enhance RabbitMQ client and setup services ([0493b6f](https://github.com/The-Heidi-Suite/heidi.microservices/commit/0493b6f29897df9160b3de3c6a28fad5eb24525c))
* **users:** add CreateGuestDto for guest user creation ([8e9ff51](https://github.com/The-Heidi-Suite/heidi.microservices/commit/8e9ff51464f1f38cb4a06ff6a516daed2f832731))
* **users:** enhance user service and controller with validation error documentation ([9c8ab7a](https://github.com/The-Heidi-Suite/heidi.microservices/commit/9c8ab7ae06f5cb15ee5458317ac36bccc7705473))
* **users:** implement email verification handling and user service updates ([ea5b01a](https://github.com/The-Heidi-Suite/heidi.microservices/commit/ea5b01a69e68df657514c5afb070a79c2f242291))
* **users:** implement guest user creation and conversion endpoints ([c91b1f5](https://github.com/The-Heidi-Suite/heidi.microservices/commit/c91b1f50aa29c3895a1de0d59614d2af0132e7d8))
* **users:** update guest user creation and validation response handling ([7407dda](https://github.com/The-Heidi-Suite/heidi.microservices/commit/7407dda1ef24fb1e0c8744570e0eeae0a2b82c40))
* **verification:** add verification module and controllers for email/SMS verification ([c43dbf7](https://github.com/The-Heidi-Suite/heidi.microservices/commit/c43dbf713729450483edb1ce782f933cf7552b6e))
* **verification:** implement email and SMS verification strategies ([c3f020a](https://github.com/The-Heidi-Suite/heidi.microservices/commit/c3f020a6f7cd81deef059ff1da2e462678e01273))


### 🐛 Bug Fixes

* **auth:** update validation response type for guest creation ([9ae731b](https://github.com/The-Heidi-Suite/heidi.microservices/commit/9ae731b295fa620156e213bfddd76b1c79ded978))


### 🔧 Chores

* **dependencies:** clean up package-lock.json and yarn.lock ([3ec3ff4](https://github.com/The-Heidi-Suite/heidi.microservices/commit/3ec3ff4d8ac9a3775058f1073bf54c96dcf580b3))
* **dependencies:** update package versions and add new dependencies ([cb1fc51](https://github.com/The-Heidi-Suite/heidi.microservices/commit/cb1fc513d8dab34bd86814b081f8bc05be6ccccc))
* **dependencies:** update package-lock and yarn.lock for dependency upgrades ([0c576bc](https://github.com/The-Heidi-Suite/heidi.microservices/commit/0c576bc72bbadc25795f4fe67a000ad95f396bc4))

## [1.12.0](https://github.com/The-Heidi-Suite/heidi.microservices/compare/v1.11.0...v1.12.0) (2025-11-05)


### 🔧 Chores

* add .prettierignore to exclude CHANGELOG.md from formatting ([0de3cf7](https://github.com/The-Heidi-Suite/heidi.microservices/commit/0de3cf70cdb7eb517f704cfeea409fc039cde596))


### ✨ Features

* **auth, users:** add comprehensive error response DTOs for authentication and user management ([32f8524](https://github.com/The-Heidi-Suite/heidi.microservices/commit/32f85242dae314b382c6feab1262274a2ee75682))
* **auth, users:** add new response DTOs for authentication and user management ([6cbafe7](https://github.com/The-Heidi-Suite/heidi.microservices/commit/6cbafe76491f0c869b35435ecb1dfe479c927ff6))
* **auth, users:** update API response types for improved clarity ([fe52172](https://github.com/The-Heidi-Suite/heidi.microservices/commit/fe521726970da8cfb188398dced24ff36ed7cca4))
* **interceptors:** add TransformInterceptor to Auth and Users modules ([4f11c22](https://github.com/The-Heidi-Suite/heidi.microservices/commit/4f11c225bbbd8dcb131e94791023fc1947f33544))


### ♻️ Code Refactoring

* **auth, users:** replace ApiErrorResponseDto with specific error response DTOs ([f13a9da](https://github.com/The-Heidi-Suite/heidi.microservices/commit/f13a9dae0181c0ed226982dc55c99f6a27e09b79))

## [1.11.0](https://github.com/The-Heidi-Suite/heidi.microservices/compare/v1.10.0...v1.11.0) (2025-11-05)


### 🔧 Chores

* **prisma:** remove deprecated Prisma schema files and migration scripts ([1ba22f7](https://github.com/The-Heidi-Suite/heidi.microservices/commit/1ba22f76b8b3c3a88191ea971eabf8557e917345))


### 🐛 Bug Fixes

* **auth, users, nginx:** update Swagger documentation endpoint and enhance Nginx configuration ([a9ec258](https://github.com/The-Heidi-Suite/heidi.microservices/commit/a9ec258535f1517b6bf8be40561a26aa5cd4fd46))
* **caddy, nginx:** update API route prefixes for services ([6437a55](https://github.com/The-Heidi-Suite/heidi.microservices/commit/6437a5586d071f14852dd552d372a8b40b6a2873))
* **prisma:** update schema paths in migration and generation scripts ([6c462a3](https://github.com/The-Heidi-Suite/heidi.microservices/commit/6c462a39fd1661451af54d0c8302e69d8dca02bb))
* update email addresses in configuration files ([39e09fd](https://github.com/The-Heidi-Suite/heidi.microservices/commit/39e09fd9c6d0322f258b31a511c3e79a6fc6b5a2))


### ♻️ Code Refactoring

* **controllers:** remove route prefixes from multiple controllers ([50efa4e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/50efa4e2712e42b2243632610a7ff5cc3d3e482d))
* **docker:** streamline Dockerfile for Prisma client generation and build process ([4ef980d](https://github.com/The-Heidi-Suite/heidi.microservices/commit/4ef980dceef45803dfe3017a380daaa49a8821dc))
* **microservices:** standardize RabbitMQ microservice connection configuration ([165a763](https://github.com/The-Heidi-Suite/heidi.microservices/commit/165a7630f989da0b71c5c049f588de95b1675494))
* **rabbitmq:** restructure RabbitMQ module and configuration ([5c1d2bf](https://github.com/The-Heidi-Suite/heidi.microservices/commit/5c1d2bfeb70b162ab2d441d57416802698054b44))
* **rabbitmq:** update RabbitMQ integration to use RmqModule ([65fa6f7](https://github.com/The-Heidi-Suite/heidi.microservices/commit/65fa6f79c75ee8ad2fadc0dee1cf27abfdfe5e72))


### ✨ Features

* **api:** add ENABLE_API_GATEWAY_PREFIX for Swagger configuration ([a85e56b](https://github.com/The-Heidi-Suite/heidi.microservices/commit/a85e56b861b45e5818784043511cb87f0ec4c1d7))
* **auth, users, nginx:** add API server endpoints and enhance Nginx configuration ([ddc6429](https://github.com/The-Heidi-Suite/heidi.microservices/commit/ddc6429df20d4b28fa162876d859852d6452ce3a))
* **auth, users:** add username support in login and registration DTOs ([4d7a077](https://github.com/The-Heidi-Suite/heidi.microservices/commit/4d7a07715c922ee701f6dac766038db2e6dc26df))
* **auth, users:** enhance API response documentation with error handling details ([2ca5e5f](https://github.com/The-Heidi-Suite/heidi.microservices/commit/2ca5e5f7542293f3dcd556495e2068a6c55fd391))
* **auth, users:** improve user authentication and registration flow ([6c448c2](https://github.com/The-Heidi-Suite/heidi.microservices/commit/6c448c21c660d1eb0ac982fd159144348db6b783))
* **auth, users:** support username login and enhance user registration ([bb9c19e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/bb9c19e78a3efb20380e708ec6df2ac8089573db))
* **auth:** enhance login documentation and examples for clarity ([ba94d1b](https://github.com/The-Heidi-Suite/heidi.microservices/commit/ba94d1b8c30c7919efb53f0c913891f9dd15f6ad))
* **caddy:** add Caddy reverse proxy configuration with automatic SSL support ([835bb0e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/835bb0e715a9133c89747caae0ba084f99b8eb26))
* **caddy:** enhance Caddy configuration for dynamic Caddyfile generation ([093b146](https://github.com/The-Heidi-Suite/heidi.microservices/commit/093b146d21dca8d330ee43a95d9b7c73e88cb3f1))
* **docker:** add sequential build script and optimize Docker Compose configuration ([1ece1b4](https://github.com/The-Heidi-Suite/heidi.microservices/commit/1ece1b479d0cb199cf7e6df8de6cbabe97a04304))
* **docker:** enhance Docker commands in package.json ([99a5b5b](https://github.com/The-Heidi-Suite/heidi.microservices/commit/99a5b5b516c8c24efefdc22433b92533e516d156))
* **docker:** enhance Dockerfile for Prisma compatibility and build optimization ([5ddb08e](https://github.com/The-Heidi-Suite/heidi.microservices/commit/5ddb08e7c4aa1500c90414be8063acf347e888fc))
* **docker:** update Dockerfile and Prisma schemas for enhanced compatibility ([0f26989](https://github.com/The-Heidi-Suite/heidi.microservices/commit/0f26989d1b121fd8745afb0d3d4a269270b641c4))
* **docker:** update Dockerfile for improved dependency management and build process ([cdf24af](https://github.com/The-Heidi-Suite/heidi.microservices/commit/cdf24af9c32f99b1799bc0c9172ed71dbdb7ec2f))
* **docker:** update RabbitMQ and Docker Compose configurations ([15e2982](https://github.com/The-Heidi-Suite/heidi.microservices/commit/15e29827845c5c5617716c3d7382a78024ba3938))
* **env:** add environment configuration and update Docker Compose for monitoring ([906c8fa](https://github.com/The-Heidi-Suite/heidi.microservices/commit/906c8faa4da5841210bb83c6769d93d8177924d8))
* **nginx, scripts:** enhance Nginx configuration and improve database URL handling ([c775ff2](https://github.com/The-Heidi-Suite/heidi.microservices/commit/c775ff2754b889d9da74996bcd56edc2c3b2194b))
* **pm2:** add ecosystem configuration for PM2 process management ([fe18eb3](https://github.com/The-Heidi-Suite/heidi.microservices/commit/fe18eb32f048fc7519957f63e4b15d841f7d4d2b))
* **prisma:** add initial migration scripts for Admin, Auth, City, Core, Integration, Notification, Scheduler, and Users schemas ([04ed67f](https://github.com/The-Heidi-Suite/heidi.microservices/commit/04ed67fbc699b88387f0b870b9243bb9265bee6a))
* **prisma:** add new Prisma schemas and migration scripts for microservices ([b6b931f](https://github.com/The-Heidi-Suite/heidi.microservices/commit/b6b931fdb908bc45e07b5ac63e246c28816dafc4))
* **prisma:** enhance database URL handling in migration script ([d2f947a](https://github.com/The-Heidi-Suite/heidi.microservices/commit/d2f947a70b374eada9a49c17096d77c0dfb0fadc))
* **rabbitmq:** introduce RmqClientWrapper for dynamic message routing ([3974682](https://github.com/The-Heidi-Suite/heidi.microservices/commit/397468218755a016294b6f253b0ea43e352a49c9))
* **rabbitmq:** update RabbitMQ configuration for environment variable support ([c1caad8](https://github.com/The-Heidi-Suite/heidi.microservices/commit/c1caad8a8be6f353618339f520d6698377566b07))

## [1.10.0](///compare/v1.9.0...v1.10.0) (2025-11-03)

### ✨ Features

- **logging:** enhance logging for message processing in Core and Users controllers e52d3d4
- **rabbitmq:** enhance RabbitMQ queue options across applications 16e3340

## [1.9.0](///compare/v1.8.0...v1.9.0) (2025-11-03)

### 🐛 Bug Fixes

- **errors:** improve error handling and messaging in GlobalExceptionFilter 34df8f7

### ✨ Features

- **config:** enhance service configuration with database settings and RabbitMQ improvements 6a87024
- **core:** implement CoreMessageController for RabbitMQ message handling 7107478
- **database:** implement database connection handling and logging for services d967f4a
- **microservices:** integrate RabbitMQ microservice support across applications 021319e
- **users:** add UsersMessageController for RabbitMQ message handling e9e2cee

### 🔧 Chores

- **dependencies:** update package.json and yarn.lock to include axios and @nestjs/axios 076c64e
- **env:** update environment configuration and enhance security 982a133
- **translations:** remove trailing whitespace in JSON translation files a90480d

## [1.8.0](///compare/v1.7.0...v1.8.0) (2025-11-03)

### 🐛 Bug Fixes

- improve context logging in LoggerService f9854a3

### ♻️ Code Refactoring

- enhance authentication flow with IP and user agent logging 95033aa
- integrate Saga pattern into AuthService for distributed transactions a3e9ff2
- replace Logger with LoggerService in multiple services for improved logging 80833f0
- update ConfigModule imports across applications 42b25cc

### ✨ Features

- add contracts library configuration and path mappings 4b9f7a4
- add DTOs for user and authentication management 8a4cd28
- add internationalization support with language decorators and translation files d6b55d4
- add JWT authentication and user profile management endpoints 36230c6
- add saga DTOs for managing saga workflows 088954c
- add saga library configuration and path mappings ea29786
- add Swagger documentation to authentication DTOs c046e54
- **config:** enhance configuration management and service ports 0cb937f
- enhance session management with new endpoints and service methods d034e3d
- enhance Swagger documentation for user management endpoints 2bc6e05
- enhance user DTOs with Swagger documentation af8e848
- **errors:** integrate I18nService into GlobalExceptionFilter for enhanced error messaging ab4e896
- **i18n:** add i18n library configuration and update TypeScript paths babf1f1
- **i18n:** add internationalization configuration and update documentation e780924
- **i18n:** integrate I18nModule and LanguageInterceptor across multiple applications 1ecbd47
- implement i18n module for internationalization support 23a88f9
- integrate Swagger documentation for authentication endpoints d75aea1
- introduce Saga Orchestrator library for managing distributed transactions 42d4524
- **swagger:** update Swagger titles for Auth and Users services bda2ca6
- **validation:** enhance ValidationInterceptor with I18nService for localized error messages b7838f1

## [1.7.0](///compare/v1.6.0...v1.7.0) (2025-11-03)

### ♻️ Code Refactoring

- comment out unused terminal module exports in index.ts af25618
- enhance ConfigService get method and clean up JWT strategy permissions retrieval d2628bc
- improve user role handling and permissions retrieval in AuthService 42016bb
- remove permissions generation and migration scripts 825900b
- remove Prisma permissions module and update JWT handling 04fb440
- remove unused permissions module and related exports f045cd3
- simplify imports and formatting in RBAC-related files d6d6185
- update interceptor and logger initialization across multiple modules 843a1fe

### ✨ Features

- add new Prisma aliases for admin, terminal, and permissions modules in tsconfig 938ad30
- add user registration functionality and enhance user management 91fdc88
- implement city management and access guards for RBAC 0d6a76b
- introduce city hierarchy service and enhance RBAC with city management features 59c3582

## [1.6.0](///compare/v1.5.0...v1.6.0) (2025-11-03)

### ✨ Features

- add permissions module and service for permissions management bb9e55c
- add permissions schema generation and migration to scripts 7f0dc26
- add tenancy and RBAC libraries to project configuration 0243329
- add tenancy module with city context management and guards c4babec
- enhance auth module with city admin assignment and user city retrieval c2d547d
- enhance JWT module and service with city and permissions support 9b622b5
- implement RBAC module with guards and services for role-based access control edf80b3

### 🐛 Bug Fixes

- downgrade @types/node version to 24.10.0 in package.json and update yarn.lock a53001e

### 📚 Documentation

- expand README with platform overview, user roles, and core features c41996f

## [1.5.0](///compare/v1.4.1...v1.5.0) (2025-11-02)

### ✨ Features

- add terminal module and service for terminal management 6980a85
- add terminal service configuration and metrics scraping 148a13d
- add terminal service configuration to Docker and environment setup c2b1ec8
- implement terminal service with core functionality 93e7aaa
- update scripts to include terminal service in production setup dd143f1

### ♻️ Code Refactoring

- comment out terminal service configurations in Nginx, Prometheus, and database initialization 32a75bd
- comment out terminal service in Docker configuration and update development scripts e92fa11
- update service configurations to exclude terminal service b7565a4
- update terminal service implementation and documentation 699d867

### [1.4.1](///compare/v1.4.0...v1.4.1) (2025-11-01)

### ✨ Features

- update scripts to include admin service in production setup dca548e

## [1.4.0](///compare/v1.3.0...v1.4.0) (2025-11-01)

### ✨ Features

- add admin service configuration and database initialization 9a234fb
- add admin service to Docker Compose and environment configuration 8145f50
- add Prisma Admin module and service for admin management 25b5b49
- implement admin service with health checks and admin management f24ea43
- update Prisma scripts to include admin service 88c094a

## [1.3.0](///compare/v1.2.0...v1.3.0) (2025-11-01)

### ✨ Features

- add PostgreSQL auto-initialization and configuration documentation 77f3821
- add Redis Commander and monitoring exporters to Docker setup bfcd0eb
- enhance Docker Compose configuration for PostgreSQL initialization 32419ef
- enhance Grafana dashboards and Prometheus configuration 75f7242
- enhance production setup with initialization script and documentation updates fc2be4b
- update environment configuration for monitoring and administration tools 593e2f1

## [1.2.0](///compare/v1.1.0...v1.2.0) (2025-11-01)

### 🔧 Chores

- add .yarnrc.yml for node-modules linker and update VSCode settings 6d2aa6f

### ✨ Features

- implement comprehensive monitoring setup for HEIDI Microservices b587067

### ♻️ Code Refactoring

- update Dockerfile paths and Node.js version in configuration cf727a0

### 📚 Documentation

- update Node.js version in getting started and project overview documentation 44f8fdd

## [1.1.0](///compare/v1.0.1...v1.1.0) (2025-11-01)

### ✨ Features

- add Prisma client generation and migration scripts d7c352e

### 🔧 Chores

- remove unused package.json files and update VSCode settings 1911f0e

### ♻️ Code Refactoring

- restructure Prisma service modules and schemas 503f3aa
- update Prisma scripts and package.json for improved service management d26e974
- update Prisma service imports and restructure Dockerfile 1ac9f46
- update TypeScript configuration and service imports 0f15af1

### 🐛 Bug Fixes

- update type assertion for Prisma service connections 068822b

### 📚 Documentation

- add comprehensive release workflow guide f1a8f2d
- update getting started and project structure documentation 06198b2

### 1.0.1 (2025-10-30)

### 📚 Documentation

- add Commit Quick Reference and Contribution Guidelines 2626c65
- **env:** add .env.example, env.template and ENVIRONMENT_VARIABLES guide 373fa0b

### 🔧 Chores

- add configuration files for Commitizen and standard-version 97beb2c
- update .gitignore and CHANGELOG.md 4122914

## [1.0.0] - 2025-01-29

### Added

- Initial release of HEIDI microservices platform
- Complete monorepo structure with NestJS CLI
- Production-ready infrastructure setup
- Developer tooling and hot-reload support

---

## Version History

- **1.0.0** - Initial release (2025-01-29)

## How to Update This Changelog

When making changes, add them under the `[Unreleased]` section using these categories:

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

Example:

```markdown
## [Unreleased]

### Added

- New email notification templates

### Fixed

- User registration validation bug
```

When releasing a new version:

1. Move items from `[Unreleased]` to a new version section
2. Add the version number and date
3. Update the version in `package.json`
4. Create a git tag
