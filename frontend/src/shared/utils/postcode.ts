// 다음(카카오) 우편번호 서비스(송연 shared/utils/postcode.ts 와 같음).
// '주소 검색' 을 누를 때만 스크립트를 불러온다(쓰지 않는 사람은 바깥 스크립트를 받지 않는다).

export type PostcodeResult = { zonecode: string; address: string };

// 스크립트를 못 받은 경우와 창을 그냥 닫은 경우를 구별해 돌려준다.
export type PostcodeSearch = PostcodeResult | null | 'unavailable';

const SCRIPT = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';

type DaumPostcodeData = { zonecode: string; roadAddress?: string; jibunAddress?: string };
type DaumGlobal = {
  Postcode: new (options: {
    oncomplete: (data: DaumPostcodeData) => void;
    onclose: () => void;
  }) => { open: () => void };
};
const daumOf = () => (window as unknown as { daum?: DaumGlobal }).daum;

let loading: Promise<boolean> | undefined;
function load(): Promise<boolean> {
  if (daumOf()?.Postcode) return Promise.resolve(true);
  loading ??= new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.onload = () => resolve(Boolean(daumOf()?.Postcode));
    script.onerror = () => {
      loading = undefined;
      resolve(false);
    };
    document.head.appendChild(script);
  });
  return loading;
}

export async function openPostcodeSearch(): Promise<PostcodeSearch> {
  if (!(await load())) return 'unavailable';
  const daum = daumOf();
  if (!daum?.Postcode) return 'unavailable';
  return new Promise<PostcodeSearch>((resolve) => {
    let picked: PostcodeResult | null = null;
    new daum.Postcode({
      oncomplete: (data) => {
        picked = { zonecode: data.zonecode, address: data.roadAddress || data.jibunAddress || '' };
      },
      // 고르고 닫든 그냥 닫든 여기로 온다. 그냥 닫았으면 아무것도 바꾸지 않는다.
      onclose: () => resolve(picked),
    }).open();
  });
}
