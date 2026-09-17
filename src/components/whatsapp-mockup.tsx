export function WhatsAppMockup() {
  return (
    <div
      className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-white shadow-xl"
      role="img"
      aria-label="Exemplo de conversa no WhatsApp: cliente pede Orlando com 2 crianças em julho e a IA Thaías qualifica o lead perguntando datas e orçamento"
    >
      <div className="flex items-center gap-3 bg-[#075e54] px-4 py-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white">
          T
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Thaías · Agência</p>
          <p className="text-xs text-white/70">online</p>
        </div>
      </div>

      <div className="space-y-3 bg-[#ece5dd] p-4">
        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-lg rounded-tr-none bg-[#dcf8c6] px-3 py-2 shadow-sm">
            <p className="text-sm text-gray-800">
              Oi! Vi um anúncio de vocês sobre Orlando. Tenho 2 crianças e quero levar a família em julho 😊
            </p>
            <p className="mt-1 text-right text-[10px] text-gray-500">23:47</p>
          </div>
        </div>

        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
            <p className="text-sm text-gray-800">
              Oi! Que ótimo, Orlando em julho é maravilhoso! 🏰 Pra eu montar a melhor opção pra vocês:
            </p>
            <p className="mt-2 text-sm text-gray-800">
              1. Quantas dias vocês pretendem ficar?
              <br />
              2. As crianças têm quantos anos?
              <br />
              3. Vocês já têm uma ideia de orçamento?
            </p>
            <p className="mt-1 text-right text-[10px] text-gray-500">23:47</p>
          </div>
        </div>

        <div className="flex justify-end">
          <div className="max-w-[80%] rounded-lg rounded-tr-none bg-[#dcf8c6] px-3 py-2 shadow-sm">
            <p className="text-sm text-gray-800">
              10 dias, crianças de 5 e 9 anos. Orçamento uns 25 mil
            </p>
            <p className="mt-1 text-right text-[10px] text-gray-500">23:48</p>
          </div>
        </div>

        <div className="flex justify-start">
          <div className="max-w-[80%] rounded-lg rounded-tl-none bg-white px-3 py-2 shadow-sm">
            <p className="text-sm text-gray-800">
              Perfeito! Com esse perfil dá pra montar um roteiro incrível com parques e hotel família. Vou preparar uma cotação e te mando até amanhã. Posso te chamar aqui? ✅
            </p>
            <p className="mt-1 text-right text-[10px] text-gray-500">23:48</p>
          </div>
        </div>
      </div>
    </div>
  );
}
