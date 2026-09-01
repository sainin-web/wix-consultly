// import React, { useState, useCallback } from "react";
// import {
//   Popover,
//   ActionList,
//   Button,
//   Box,
//   Text,
//   InlineStack,
// } from "@shopify/polaris";

// const languages = [
//   { code: "en", name: "English", flag: "./images/flag/en.svg" },
//   { code: "fr", name: "French", flag: "./images/flag/fr.svg" },
//   { code: "hi", name: "Hindi", flag: "./images/flag/hi.svg" },
//   { code: "ja", name: "Japanese", flag: "./images/flag/ja.svg" },
//   { code: "ru", name: "Russian", flag: "./images/flag/ru.svg" },
//   { code: "sn", name: "Shona", flag: "./images/flag/sn.svg" },
//   { code: "st", name: "Sesotho", flag: "./images/flag/st.svg" },
//   { code: "es", name: "Spanish", flag: "./images/flag/es.svg" },
//   { code: "tg", name: "Tajik", flag: "./images/flag/tg.svg" },
// ];

// export default function LanguageSelector() {
//   const [active, setActive] = useState(false);
//   const [selected, setSelected] = useState(languages[0]);

//   const toggleActive = useCallback(() => setActive((active) => !active), []);
//   const handleSelect = (lang) => {
//     setSelected(lang);
//     setActive(false);
//   };

//   return (
//     <Box>
//       <Popover
//         active={active}
//         activator={
//           <Button
//             onClick={toggleActive}
//             disclosure="down"
//             variant="secondary"
//             icon={
//               <Box style={{ display: "flex", alignItems: "center" }}>
//                 <img
//                   src={selected.flag}
//                   alt={selected.name}
//                   width={16}
//                   height={16}
//                   style={{
//                     borderRadius: "50%",
//                     objectFit: "cover",
//                     marginRight: "5px",
//                     verticalAlign: "middle",
//                     boxShadow: "0px 0px 10px 1px #0000001f",
//                   }}
//                 />
//               </Box>
//             }
//           >
//             {selected.name}
//           </Button>
//         }
//         onClose={() => setActive(false)}
//       >
//         <Box padding="100" minWidth="130px">
//           <ActionList
//             actionRole="menuitem"
//             items={languages.map((lang) => ({
//               content: lang.name,
//               prefix: (
//                 <img
//                   src={lang.flag}
//                   alt={lang.name}
//                   width={16}
//                   height={16}
//                   style={{
//                     borderRadius: "50%",
//                     objectFit: "cover",
//                     boxShadow: "0px 0px 10px 1px #0000001f",
//                   }}
//                 />
//               ),
//               onAction: () => handleSelect(lang),
//             }))}
//           />
//         </Box>
//       </Popover>
//     </Box>
//   );
// }
