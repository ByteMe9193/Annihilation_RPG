import React, { useState, useEffect } from "react";
import { getCharacter, updateCharacter } from "@/services/firebase/characters";
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, Link } from "expo-router";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import Svg, { Path, Polygon, Polyline, Line } from "react-native-svg";

const { width } = Dimensions.get("window");

const characters = {
  Ciborgue: {
    photo: require("@/assets/characters/cyborg-photo.png"),
    race: "Ciborgue",
  },

  Tengu: {
    photo: require("@/assets/characters/tengu-photo.png"),
    race: "Tengu",
  },

  Elfo: {
    photo: require("@/assets/characters/elf-photo.png"),
    race: "Elfo",
  },

  Tiefling: {
    photo: require("@/assets/characters/tiefling-photo.png"),
    race: "Tiefling",
  },

  Draconata: {
    photo: require("@/assets/characters/dragonborn-photo.png"),
    race: "Draconata",
  },
};

function EditIcon({ size = 18 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 17.25L3 21L6.75 21L17.81 9.94L14.06 6.19L3 17.25ZM20.71 7.04C21.1 6.65 21.1 6.02 20.71 5.63L18.37 3.29C17.98 2.9 17.35 2.9 16.96 3.29L15.13 5.12L18.88 8.87L20.71 7.04Z"
        fill="#ffffff"
      />
    </Svg>
  );
}

function BrainIcon({ size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <Path
        d="M502.198 263.697C492.386 148.068 375.395 65.876 259.027 65.876C105.865 65.876 116.018 116.015 98.945 117.436C57.128 120.813 0 169.687 0 226.746C0 283.894 23.702 339.61 92.638 339.61C88.442 363.283 96.803 401.634 171.258 401.634C206.922 401.634 257.11 401.634 274.407 401.634C274.407 458.003 359.441 444.774 389.305 444.774C419.246 444.774 424.123 412.712 418.663 404.389C511.99 403.679 525.092 306.224 502.198 263.697Z"
        fill="#ffffff"
      />

      <Path
        d="M367.112 114.661H393.559C399.243 114.661 403.867 119.295 403.867 125.027C403.867 130.887 399.243 135.55 393.559 135.55H367.112C361.252 135.55 356.61 130.887 356.61 125.027C356.61 119.295 361.252 114.661 367.112 114.661Z"
        fill="#050505"
      />

      <Path
        d="M290.477 150.881H295.626C301.135 150.881 302.566 149.966 302.566 149.966C303.082 148.963 303.082 145.099 303.082 142.656V112.151C303.082 106.447 307.637 101.735 313.448 101.735C319.142 101.735 323.834 106.447 323.834 112.151V142.491C323.941 145.099 323.941 148 323.532 150.881H358.01C359.07 150.881 360.22 150.832 361.601 150.832C369.973 150.482 382.646 150.112 391.971 159.057C398.025 164.907 401.199 173.667 401.199 184.997V221.694C401.199 225.14 401.073 232.323 402.98 234.299C403.866 235.126 405.978 235.185 406.738 235.185H460.479C466.125 235.185 470.757 239.935 470.757 245.649C470.757 251.499 466.124 256.152 460.479 256.152H406.738C397.179 256.152 391.32 252.298 388.166 249.046C380.077 240.821 380.106 228.712 380.33 221.519V219.962V184.997C380.33 179.722 379.278 175.789 377.467 174.018C374.615 171.263 367.812 171.497 362.303 171.74C360.735 171.74 359.334 171.856 358.01 171.856H289.61C289.61 171.856 289.502 171.74 289.279 171.74C280.606 171.74 268.235 171.74 264.924 175C264.72 175.243 263.941 175.857 263.941 178.494V235.456C263.941 241.268 259.201 245.969 253.526 245.969C247.763 245.969 243.081 241.268 243.081 235.456V178.494C243.081 169.218 247.053 163.406 250.225 160.195C259.942 150.657 276.276 150.706 290.477 150.881Z"
        fill="#050505"
      />

      <Path
        d="M199.174 92.303C199.174 86.551 203.856 81.83 209.521 81.83C215.362 81.83 220.023 86.55 220.023 92.303V103.808H237.535C243.2 103.808 247.882 108.568 247.882 114.243C247.882 120.054 243.2 124.746 237.535 124.746H220.023V139.688C220.023 145.381 215.361 150.161 209.521 150.161C203.856 150.161 199.174 145.381 199.174 139.688V92.303Z"
        fill="#050505"
      />

      <Path
        d="M96.482 144.584H139.818C149.794 144.496 162.302 144.408 171.559 153.694C178.695 160.712 182.14 171.352 182.14 186.38V197.438H198.503C204.275 197.438 208.879 202.217 208.879 207.989C208.879 213.741 204.275 218.443 198.503 218.443H182.14V227.107C182.14 232.869 177.41 237.6 171.744 237.6C165.865 237.6 161.212 232.869 161.212 227.107V186.38C161.212 177.522 159.664 171.351 156.852 168.606C153.688 165.268 146.952 165.268 139.866 165.52H96.482C90.564 165.52 86.028 160.8 86.028 154.998C86.028 149.323 90.564 144.584 96.482 144.584Z"
        fill="#050505"
      />

      <Path
        d="M87.77 236.909V255.968C87.77 261.779 83.166 266.432 77.228 266.432C71.514 266.432 66.91 261.779 66.91 255.968V236.909H40.366C34.585 236.909 29.864 232.187 29.864 226.435C29.864 220.663 34.585 215.932 40.366 215.932H113.594C119.221 215.932 124.019 220.663 124.019 226.435C124.019 232.187 119.221 236.909 113.594 236.909H87.77Z"
        fill="#050505"
      />

      <Path
        d="M141.16 305.679C135.164 311.548 132.312 320.134 132.312 331.97C132.312 337.634 127.562 342.434 121.858 342.434C116.018 342.434 111.433 337.635 111.433 331.97C111.433 314.546 116.504 300.695 126.472 290.863C144.246 273.323 172.22 273.771 188.856 274.024C190.666 274.024 192.165 274.024 193.636 274.024H277.951C291.15 274.024 300.757 271.134 306.189 265.352C315.086 255.968 314.365 239.392 313.722 225.92C313.587 222.688 313.45 219.652 313.45 217.004C313.45 211.183 318.054 206.55 323.748 206.55C329.647 206.55 334.31 211.183 334.31 217.004C334.31 219.33 334.446 222.104 334.582 225.054C335.352 240.502 336.392 263.882 321.481 279.67C311.776 289.832 297.185 294.932 277.951 294.932H193.636C192.088 294.932 190.356 294.932 188.526 294.932C174.275 294.737 152.646 294.406 141.16 305.679Z"
        fill="#050505"
      />

      <Path
        d="M249.303 350.687V371.556C249.303 377.407 244.641 382.001 238.869 382.001C233.116 382.001 228.473 377.407 228.473 371.556V350.687H188.009C182.315 350.687 177.526 346.014 177.526 340.223C177.526 334.549 182.315 329.779 188.009 329.779H320.331C326.162 329.779 330.746 334.549 330.746 340.223C330.746 346.014 326.162 350.687 320.331 350.687H249.303Z"
        fill="#050505"
      />

      <Path
        d="M390.025 402.247H328.041C322.278 402.247 317.596 397.604 317.596 391.862C317.596 386.05 322.278 381.388 328.041 381.388H364.251V361.94C364.251 356.022 368.913 351.466 374.695 351.466C380.516 351.466 385.11 356.022 385.11 361.94V381.388H390.026C395.749 381.388 400.451 386.05 400.451 391.862C400.45 397.604 395.748 402.247 390.025 402.247Z"
        fill="#050505"
      />

      <Path
        d="M417.105 329.779V312.715H368.757C363.013 312.715 358.303 308.131 358.303 302.349C358.303 296.577 363.013 291.846 368.757 291.846H441.809C447.698 291.846 452.36 296.577 452.36 302.349C452.36 308.131 447.698 312.715 441.809 312.715H438.052V329.779C438.052 335.669 433.36 340.224 427.607 340.224C421.845 340.224 417.105 335.669 417.105 329.779Z"
        fill="#050505"
      />

      <Path
        d="M470.758 377.806H444.331C438.5 377.806 433.837 373.251 433.837 367.44C433.837 361.629 438.5 357.034 444.331 357.034H470.758C476.618 357.034 481.329 361.629 481.329 367.44C481.329 373.251 476.618 377.806 470.758 377.806Z"
        fill="#050505"
      />
    </Svg>
  );
}

function CardsIcon({ size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 76 76" fill="none">
      <Path
        d="M21.3 17H46.7C47.418 17 48 17.5821 48 18.3V24.7C48 25.418 47.418 26 46.7 26H31.3C30.0298 26 29 27.0298 29 28.3V49.7C29 50.418 28.418 51 27.7 51H21.3C20.582 51 20 50.418 20 49.7V18.3C20 17.582 20.582 17 21.3 17ZM33.3 29H54.7C55.418 29 56 29.5821 56 30.3V57.7C56 58.418 55.418 59 54.7 59H33.3C32.582 59 32 58.418 32 57.7V30.3C32 29.582 32.582 29 33.3 29Z"
        fill="#ffffff"
      />
    </Svg>
  );
}

function SheetIcon({ size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Polygon
        points="23,1 55,1 55,63 9,63 9,15"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeMiterlimit="10"
      />

      <Polyline
        points="9,15 23,15 23,1"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
        strokeMiterlimit="10"
      />

      <Line
        x1="32"
        y1="14"
        x2="46"
        y2="14"
        stroke="#ffffff"
        strokeWidth="2"
        strokeMiterlimit="10"
      />

      <Line
        x1="18"
        y1="24"
        x2="46"
        y2="24"
        stroke="#ffffff"
        strokeWidth="2"
        strokeMiterlimit="10"
      />

      <Line
        x1="18"
        y1="34"
        x2="46"
        y2="34"
        stroke="#ffffff"
        strokeWidth="2"
        strokeMiterlimit="10"
      />

      <Line
        x1="18"
        y1="44"
        x2="46"
        y2="44"
        stroke="#ffffff"
        strokeWidth="2"
        strokeMiterlimit="10"
      />

      <Line
        x1="18"
        y1="54"
        x2="46"
        y2="54"
        stroke="#ffffff"
        strokeWidth="2"
        strokeMiterlimit="10"
      />
    </Svg>
  );
}

function InventoryIcon({ size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 -0.5 25 25" fill="none">
      <Path
        d="M13.05 12.082C13.05 11.6678 12.7142 11.332 12.3 11.332C11.8858 11.332 11.55 11.6678 11.55 12.082H13.05ZM12.3 19H11.55C11.55 19.249 11.6736 19.4818 11.8799 19.6213C12.0862 19.7608 12.3483 19.7888 12.5794 19.696L12.3 19ZM18.044 16.694L18.3234 17.39C18.6077 17.2759 18.794 17.0003 18.794 16.694H18.044ZM18.794 11.9C18.794 11.4858 18.4582 11.15 18.044 11.15C17.6298 11.15 17.294 11.4858 17.294 11.9H18.794ZM12.7554 11.4861C12.4263 11.2346 11.9556 11.2975 11.7041 11.6266C11.4526 11.9557 11.5155 12.4264 11.8446 12.6779L12.7554 11.4861ZM14.348 13.647L13.8926 14.2429C14.1156 14.4133 14.415 14.445 14.6687 14.325L14.348 13.647ZM18.3617 12.578C18.7361 12.4008 18.8961 11.9537 18.719 11.5793C18.5418 11.2049 18.0947 11.0449 17.7203 11.222L18.3617 12.578ZM12.0206 11.386C11.6362 11.5403 11.4497 11.977 11.604 12.3614C11.7583 12.7458 12.195 12.9323 12.5794 12.778L12.0206 11.386ZM18.3234 10.472C18.7078 10.3177 18.8943 9.88097 18.74 9.49658C18.5857 9.11219 18.149 8.92567 17.7646 9.07999L18.3234 10.472ZM17.7647 10.472C18.1491 10.6263 18.5858 10.4397 18.74 10.0553C18.8943 9.6709 18.7077 9.23421 18.3233 9.07995L17.7647 10.472ZM12.5793 6.77495C12.1949 6.62069 11.7582 6.80727 11.604 7.19168C11.4497 7.5761 11.6363 8.01279 12.0207 8.16705L12.5793 6.77495ZM18.4115 9.12322C18.0505 8.92024 17.5932 9.0484 17.3902 9.40947C17.1872 9.77054 17.3154 10.2278 17.6765 10.4308L18.4115 9.12322ZM20.095 10.93L20.4153 11.6082C20.669 11.4884 20.8346 11.237 20.8445 10.9566C20.8545 10.6762 20.7071 10.4137 20.4625 10.2762L20.095 10.93ZM17.7207 11.2218C17.3462 11.3987 17.1859 11.8457 17.3628 12.2203C17.5397 12.5948 17.9867 12.7551 18.3613 12.5782L17.7207 11.2218ZM17.4849 9.27273C17.207 9.57984 17.2306 10.0541 17.5377 10.3321C17.8448 10.61 18.3191 10.5864 18.5971 10.2793L17.4849 9.27273ZM20.5 7.059L21.0561 7.56227C21.2259 7.37459 21.2897 7.11388 21.2255 6.86901C21.1614 6.62413 20.9781 6.42812 20.738 6.34778L20.5 7.059ZM14.348 5L14.586 4.28878C14.2926 4.19056 13.9689 4.28268 13.7711 4.52071L14.348 5ZM11.7181 6.99171C11.4534 7.31031 11.4971 7.78317 11.8157 8.04787C12.1343 8.31258 12.6072 8.26889 12.8719 7.95029L11.7181 6.99171ZM6.27168 9.07995C5.88727 9.23421 5.70069 9.6709 5.85495 10.0553C6.00921 10.4397 6.4459 10.6263 6.83032 10.472L6.27168 9.07995ZM12.5743 8.16705C12.9587 8.01279 13.1453 7.5761 12.991 7.19168C12.8368 6.80727 12.4001 6.62069 12.0157 6.77495L12.5743 8.16705ZM6.91853 10.4298C7.2796 10.2268 7.40776 9.76954 7.20478 9.40847C7.00179 9.0474 6.54454 8.91924 6.18347 9.12222L6.91853 10.4298ZM4.5 10.929L4.13247 10.2752C3.88802 10.4126 3.74065 10.675 3.75046 10.9552C3.76027 11.2355 3.92561 11.4869 4.17908 11.6069L4.5 10.929ZM6.23008 12.5779C6.60445 12.7551 7.05163 12.5953 7.22887 12.2209C7.40611 11.8465 7.2463 11.3994 6.87192 11.2221L6.23008 12.5779ZM6.83042 9.07999C6.44603 8.92567 6.00931 9.11219 5.85499 9.49658C5.70067 9.88097 5.88719 10.3177 6.27158 10.472L6.83042 9.07999ZM12.0156 12.778C12.4 12.9323 12.8367 12.7458 12.991 12.3614C13.1453 11.977 12.9588 11.5403 12.5744 11.386L12.0156 12.778ZM5.9907 10.2746C6.26604 10.584 6.74011 10.6116 7.04956 10.3363C7.35901 10.061 7.38665 9.58689 7.1113 9.27744L5.9907 10.2746ZM4.5 7.471L4.20362 6.78205C3.98226 6.87727 3.82014 7.07305 3.76786 7.30828C3.71558 7.54351 3.77951 7.78954 3.9397 7.96956L4.5 7.471ZM10.244 5L10.8211 4.52099C10.6087 4.26508 10.2531 4.17962 9.94762 4.31105L10.244 5ZM11.7179 7.95001C11.9824 8.26874 12.4553 8.31265 12.774 8.0481C13.0927 7.78355 13.1367 7.31071 12.8721 6.99199L11.7179 7.95001ZM13.045 12.083C13.045 11.6688 12.7092 11.333 12.295 11.333C11.8808 11.333 11.545 11.6688 11.545 12.083H13.045ZM12.295 19L12.0156 19.696C12.2467 19.7888 12.5088 19.7608 12.7151 19.6213C12.9214 19.4818 13.045 19.249 13.045 19H12.295ZM6.551 16.694H5.801C5.801 17.0003 5.9873 17.2759 6.27158 17.39L6.551 16.694ZM7.301 11.9C7.301 11.4858 6.96521 11.15 6.551 11.15C6.13679 11.15 5.801 11.4858 5.801 11.9H7.301ZM12.75 12.6782C13.0793 12.427 13.1425 11.9563 12.8912 11.627C12.64 11.2977 12.1693 11.2345 11.84 11.4858L12.75 12.6782ZM10.244 13.647L9.92328 14.325C10.1768 14.4449 10.476 14.4134 10.699 14.2432L10.244 13.647ZM6.87172 11.222C6.49729 11.0449 6.05016 11.2049 5.87303 11.5793C5.6959 11.9537 5.85585 12.4008 6.23028 12.578L6.87172 11.222ZM11.55 12.082V19H13.05V12.082H11.55ZM12.5794 19.696L18.3234 17.39L17.7646 15.998L12.0206 18.304L12.5794 19.696ZM18.794 16.694V11.9H17.294V16.694H18.794ZM11.8446 12.6779L13.8926 14.2429L14.8034 13.0511L12.7554 11.4861L11.8446 12.6779ZM14.6687 14.325L18.3617 12.578L17.7203 11.222L14.0273 12.969L14.6687 14.325ZM12.5794 12.778L18.3234 10.472L17.7646 9.07999L12.0206 11.386L12.5794 12.778ZM18.3233 9.07995L12.5793 6.77495L12.0207 8.16705L17.7647 10.472L18.3233 9.07995ZM17.6765 10.4308L19.7275 11.5838L20.4625 10.2762L18.4115 9.12322L17.6765 10.4308ZM19.7747 10.2518L17.7207 11.2218L18.3613 12.5782L20.4153 11.6082L19.7747 10.2518ZM18.5971 10.2793L21.0561 7.56227L19.9439 6.55573L17.4849 9.27273L18.5971 10.2793ZM20.738 6.34778L14.586 4.28878L14.11 5.71122L20.262 7.77022L20.738 6.34778ZM13.7711 4.52071L11.7181 6.99171L12.8719 7.95029L14.9249 5.47929L13.7711 4.52071ZM6.83032 10.472L12.5743 8.16705L12.0157 6.77495L6.27168 9.07995L6.83032 10.472ZM6.18347 9.12222L4.13247 10.2752L4.86753 11.5828L6.91853 10.4298L6.18347 9.12222ZM4.17908 11.6069L6.23008 12.5779L6.87192 11.2221L4.82092 10.2511L4.17908 11.6069ZM6.27158 10.472L12.0156 12.778L12.5744 11.386L6.83042 9.07999L6.27158 10.472ZM7.1113 9.27744L5.0603 6.97244L3.9397 7.96956L5.9907 10.2746L7.1113 9.27744ZM4.79638 8.15995L10.5404 5.68895L9.94762 4.31105L4.20362 6.78205L4.79638 8.15995ZM9.6669 5.47901L11.7179 7.95001L12.8721 6.99199L10.8211 4.52099L9.6669 5.47901ZM11.545 12.083V19H13.045V12.083H11.545ZM12.5744 18.304L6.83042 15.998L6.27158 17.39L12.0156 19.696L12.5744 18.304ZM7.301 16.694V11.9H5.801V16.694H7.301ZM11.84 11.4858L9.78904 13.0508L10.699 14.2432L12.75 12.6782L11.84 11.4858ZM10.5647 12.969L6.87172 11.222L6.23028 12.578L9.92328 14.325L10.5647 12.969Z"
        fill="#ffffff"
      />
    </Svg>
  );
}

function NotesIcon({ size = 22 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11.7769 10L16.6065 11.2941"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <Path
        d="M11 12.8975L13.8978 13.6739"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <Path
        d="M20.3116 12.6473C19.7074 14.9024 19.4052 16.0299 18.7203 16.7612C18.1795 17.3386 17.4796 17.7427 16.7092 17.9223C16.6129 17.9448 16.5152 17.9621 16.415 17.9744C15.4999 18.0873 14.3834 17.7881 12.3508 17.2435C10.0957 16.6392 8.96815 16.3371 8.23687 15.6522C7.65945 15.1114 7.25537 14.4115 7.07573 13.641C6.84821 12.6652 7.15033 11.5377 7.75458 9.28263L8.27222 7.35077C8.35912 7.02646 8.43977 6.72546 8.51621 6.44561C8.97128 4.77957 9.27709 3.86298 9.86351 3.23687C10.4043 2.65945 11.1042 2.25537 11.8747 2.07573C12.8504 1.84821 13.978 2.15033 16.2331 2.75458C18.4881 3.35883 19.6157 3.66095 20.347 4.34587C20.9244 4.88668 21.3285 5.58657 21.5081 6.35703C21.669 7.04708 21.565 7.81304 21.2766 9"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <Path
        d="M3.27222 16.647C3.87647 18.9021 4.17859 20.0296 4.86351 20.7609C5.40432 21.3383 6.10421 21.7424 6.87466 21.922C7.85044 22.1495 8.97798 21.8474 11.2331 21.2432C13.4881 20.6389 14.6157 20.3368 15.347 19.6519C15.8399 19.1902 16.2065 18.6126 16.415 17.9741M8.51621 6.44531C8.16368 6.53646 7.77741 6.63996 7.35077 6.75428C5.09569 7.35853 3.96815 7.66065 3.23687 8.34557C2.65945 8.88638 2.25537 9.58627 2.07573 10.3567C1.91482 11.0468 2.01883 11.8129 2.30728 13"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function CharacterReveal() {
  const { character } = useLocalSearchParams<{
    character?: string;
  }>();

  const characterName = character ?? "Ciborgue";

  const data =
    characters[characterName as keyof typeof characters] ?? characters.Ciborgue;

  const firebaseCharacterId =
    characterName === "Ciborgue"
      ? "cyborg"
      : characterName === "Tengu"
        ? "tengu"
        : characterName === "Elfo"
          ? "elf"
          : characterName === "Tiefling"
            ? "tiefling"
            : characterName === "Draconata"
              ? "dragonborn"
              : "cyborg";

  const [name, setName] = useState(data.race);

  const [vidaAtual, setVidaAtual] = useState("0");
  const [vidaMaxima, setVidaMaxima] = useState("0");

  const [evasao, setEvasao] = useState("0");

  const [instintoAtual, setInstintoAtual] = useState("0");

  const [attributes, setAttributes] = useState({
    FOR: "0",
    AGI: "0",
    DES: "0",
    VIG: "0",
    INT: "0",
    PRE: "0",
  });

  // CARREGAR PERSONAGEM DO FIREBASE
  useEffect(() => {
    async function loadCharacter() {
      try {
        const firebaseData = await getCharacter(firebaseCharacterId);

        setName(firebaseData.nome ?? data.race);

        setVidaAtual(String(firebaseData.vidaAtual ?? 0));
        setVidaMaxima(String(firebaseData.vidaMaxima ?? 0));

        setEvasao(String(firebaseData.evasao ?? 0));

        setInstintoAtual(String(firebaseData.instintoAtual ?? 0));

        setAttributes({
          FOR: String(firebaseData.forca ?? 0),
          AGI: String(firebaseData.agilidade ?? 0),
          DES: String(firebaseData.destreza ?? 0),
          VIG: String(firebaseData.vigor ?? 0),
          INT: String(firebaseData.intelecto ?? 0),
          PRE: String(firebaseData.presenca ?? 0),
        });

        console.log("🔥 FICHA CARREGADA DO FIREBASE:", firebaseData);
      } catch (error) {
        console.error("❌ ERRO AO CARREGAR PERSONAGEM:", error);
      }
    }

    loadCharacter();
  }, [firebaseCharacterId]);

  // SALVAR UM CAMPO NO FIREBASE
  const saveField = async (field: string, value: string) => {
    try {
      const numericFields = [
        "vidaAtual",
        "vidaMaxima",
        "evasao",
        "instintoAtual",
        "forca",
        "agilidade",
        "destreza",
        "vigor",
        "intelecto",
        "presenca",
      ];

      const finalValue = numericFields.includes(field)
        ? Number(value) || 0
        : value;

      await updateCharacter(firebaseCharacterId, {
        [field]: finalValue,
      });

      console.log(`💾 ${field} salvo:`, finalValue);
    } catch (error) {
      console.error(`❌ ERRO AO SALVAR ${field}:`, error);
    }
  };

  const updateAttribute = (
    attribute: keyof typeof attributes,
    value: string,
  ) => {
    setAttributes((current) => ({
      ...current,
      [attribute]: value,
    }));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* CABEÇALHO */}

        <Animated.View entering={FadeIn.duration(800)} style={styles.header}>
          <Text style={styles.system}>SYSTEM ONLINE</Text>

          <Text style={styles.title}>IDENTIDADE</Text>

          <View style={styles.line} />
        </Animated.View>

        {/* IDENTIDADE */}

        <Animated.View
          entering={FadeInDown.delay(300).duration(800)}
          style={styles.identity}
        >
          <Image source={data.photo} style={styles.photo} resizeMode="cover" />

          <View style={styles.nameRow}>
            <TextInput
              value={name}
              onChangeText={setName}
              onBlur={() => saveField("nome", name)}
              style={styles.nameInput}
              placeholder="NOME"
              placeholderTextColor="#555"
              autoCorrect={false}
            />

            <TouchableOpacity style={styles.editButton} activeOpacity={0.7}>
              <EditIcon size={18} />
            </TouchableOpacity>
          </View>

          <Text style={styles.race}>{data.race.toUpperCase()}</Text>
        </Animated.View>

        {/* FICHA */}

        <Animated.View
          entering={FadeInUp.delay(700).duration(900)}
          style={styles.sheet}
        >
          {/* ESTADO */}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>◉</Text>
            <Text style={styles.sectionTitle}>ESTADO</Text>

            <View style={styles.sectionLine} />
          </View>

          <View style={styles.stateGrid}>
            {/* VIDA */}

            <View style={styles.stateBox}>
              <Text style={styles.stateLabel}>VIDA</Text>

              <View style={styles.valueRow}>
                <TextInput
                  value={vidaAtual}
                  onChangeText={setVidaAtual}
                  onBlur={() => saveField("vidaAtual", vidaAtual)}
                  keyboardType="numeric"
                  style={styles.valueInput}
                />

                <Text style={styles.slash}>/</Text>

                <TextInput
                  value={vidaMaxima}
                  onChangeText={setVidaMaxima}
                  onBlur={() => saveField("vidaMaxima", vidaMaxima)}
                  keyboardType="numeric"
                  style={styles.valueInput}
                />
              </View>
            </View>

            {/* EVASÃO */}

            <View style={styles.stateBox}>
              <Text style={styles.stateLabel}>EVASÃO</Text>

              <TextInput
                value={evasao}
                onChangeText={setEvasao}
                onBlur={() => saveField("evasao", evasao)}
                keyboardType="numeric"
                style={styles.singleValueInput}
              />
            </View>

            {/* INSTINTO */}

            <View style={styles.stateBox}>
              <Text style={styles.stateLabel}>INSTINTO</Text>

              <View style={styles.valueRow}>
                <TextInput
                  value={instintoAtual}
                  onChangeText={(value) => {
                    const numeric = Number(value);

                    if (value === "" || numeric <= 10) {
                      setInstintoAtual(value);
                    }
                  }}
                  onBlur={() => saveField("instintoAtual", instintoAtual)}
                  keyboardType="numeric"
                  style={styles.valueInput}
                />

                <Text style={styles.slash}>/</Text>

                <Text style={styles.fixedValue}>10</Text>
              </View>
            </View>
          </View>

          {/* ATRIBUTOS */}

          <View style={[styles.sectionHeader, styles.attributesHeader]}>
            <Text style={styles.sectionIcon}>▥</Text>
            <Text style={styles.sectionTitle}>ATRIBUTOS</Text>

            <View style={styles.sectionLine} />
          </View>

          <View style={styles.attributesGrid}>
            {(Object.keys(attributes) as Array<keyof typeof attributes>).map(
              (attribute) => (
                <View style={styles.attribute} key={attribute}>
                  <Text style={styles.attributeLabel}>{attribute}</Text>

                  <TextInput
                    value={attributes[attribute]}
                    onChangeText={(value) => updateAttribute(attribute, value)}
                    onBlur={() => {
                      const fieldMap = {
                        FOR: "forca",
                        AGI: "agilidade",
                        DES: "destreza",
                        VIG: "vigor",
                        INT: "intelecto",
                        PRE: "presenca",
                      } as const;

                      saveField(fieldMap[attribute], attributes[attribute]);
                    }}
                    keyboardType="numeric"
                    style={styles.attributeInput}
                  />
                </View>
              ),
            )}
          </View>
        </Animated.View>
      </ScrollView>

      {/* NAVEGAÇÃO */}

      <Animated.View
        entering={FadeIn.delay(1400).duration(800)}
        style={styles.navigation}
      >
        <Link href="/menu/memories" asChild>
          <TouchableOpacity style={styles.navButton}>
            <BrainIcon size={22} />
            <Text style={styles.navText}>MEMÓRIAS</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/menu/cards" asChild>
          <TouchableOpacity style={styles.navButton}>
            <CardsIcon size={22} />
            <Text style={styles.navText}>CARDS</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/menu/sheets" asChild>
          <TouchableOpacity style={styles.navButton}>
            <SheetIcon size={22} />
            <Text style={styles.navText}>FICHA</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/menu/inventory" asChild>
          <TouchableOpacity style={styles.navButton}>
            <InventoryIcon size={22} />
            <Text style={styles.navText}>INVENTÁRIO</Text>
          </TouchableOpacity>
        </Link>

        <Link href="/menu/notes" asChild>
          <TouchableOpacity style={styles.navButton}>
            <NotesIcon size={22} />
            <Text style={styles.navText}>NOTAS</Text>
          </TouchableOpacity>
        </Link>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050505",
    paddingTop: 50,
    paddingHorizontal: 14,
  },

  content: {
    flex: 1,
  },

  contentContainer: {
    paddingBottom: 90,
  },

  header: {
    alignItems: "center",
  },

  system: {
    color: "#555",
    fontSize: 9,
    letterSpacing: 3,
    marginBottom: 8,
  },

  title: {
    color: "#fff",
    fontSize: 23,
    fontWeight: "700",
    letterSpacing: 6,
  },

  line: {
    width: width * 0.7,
    height: 1,
    backgroundColor: "#333",
    marginTop: 12,
  },

  identity: {
    alignItems: "center",
    marginTop: 20,
  },

  photo: {
    width: 200,
    maxHeight: 275,
  },

  nameRow: {
    position: "relative",
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },

  nameInput: {
    color: "#fff",
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: 3,
    textAlign: "center",
    marginTop: 0,
    paddingVertical: 0,
    minWidth: 180,
  },

  editButton: {
    position: "absolute",
    marginLeft: 220,
    padding: 4,
  },

  race: {
    color: "#666",
    fontSize: 10,
    letterSpacing: 3,
    marginTop: 3,
  },

  sheet: {
    marginTop: 22,
    borderWidth: 1,
    borderColor: "#292929",
    backgroundColor: "#0b0b0b",
    padding: 14,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  sectionIcon: {
    color: "#aaa",
    fontSize: 12,
    marginRight: 10,
  },

  sectionTitle: {
    color: "#aaa",
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: "600",
  },

  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#292929",
    marginLeft: 10,
  },

  stateGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },

  stateBox: {
    width: "31.5%",
    minHeight: 85,
    borderWidth: 1,
    borderColor: "#444",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },

  stateLabel: {
    color: "#aaa",
    fontSize: 10,
    letterSpacing: 1,
    marginBottom: 8,
  },

  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  valueInput: {
    color: "#fff",
    fontSize: 19,
    textAlign: "center",
    minWidth: 28,
    padding: 0,
  },

  slash: {
    color: "#777",
    fontSize: 18,
    marginHorizontal: 2,
  },

  fixedValue: {
    color: "#aaa",
    fontSize: 19,
    minWidth: 28,
    textAlign: "center",
  },

  singleValueInput: {
    color: "#fff",
    fontSize: 21,
    textAlign: "center",
    padding: 0,
  },

  attributesHeader: {
    marginTop: 22,
  },

  attributesGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },

  attribute: {
    alignItems: "center",
    width: "15%",
  },

  attributeLabel: {
    color: "#aaa",
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 7,
  },

  attributeInput: {
    color: "#fff",
    fontSize: 17,
    textAlign: "center",
    width: 38,
    padding: 0,
  },

  navigation: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: "#0a0a0a",
    borderTopWidth: 1,
    borderTopColor: "#222",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },

  navButton: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    height: "100%",
  },

  navIcon: {
    marginBottom: 4,
  },

  navText: {
    color: "#777",
    fontSize: 8,
    letterSpacing: 1,
    textAlign: "center",
  },
});
