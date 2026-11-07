import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NEWS_DATA = [
  {
    title: "Uma Nova História Começa: Arthur Halal Toma Posse como Vereador de Pelotas",
    slug: "arthur-halal-toma-posse-vereador-pelotas",
    summary: "Com esperança, fé e determinação, o mais jovem vereador de Pelotas inicia seu mandato com um compromisso inabalável com o povo pelotense.",
    content: "No dia 2 de janeiro de 2025, Pelotas assistiu ao nascimento de uma nova era política. Arthur Halal, jovem empreendedor nascido e criado na cidade, entregou oficialmente seu nome, seu comprometimento e seu suor à vida pública. Com apenas 27 anos, tornou-se o mais jovem vereador da história da Câmara Municipal de Pelotas, representando uma renovação geracional que há muito tempo a política local clamava. A cerimônia de posse, realizada na Câmara Municipal, reuniu familiares, amigos, apoiadores e lideranças comunitárias de todos os bairros da cidade. O momento foi marcado por emoção e pela certeza de que novas ideias, aliadas à disposição de trabalho, podem transformar a realidade de uma cidade inteira. Arthur Halal não chegou sozinho ao cargo: carrega consigo o legado de sua família e os ensinamentos que moldaram sua visão de mundo. Desde a infância, aprendeu da janela de sua casa que os grandes desafios da vida são superados com suor e trabalho duro. Aprendeu que a solidariedade é algo que deve ser propagado e não guardado. Seu pai, Eduardo Abreu, lhe ensinou que nada se faz sozinho e que a política, quando exercida com verdade, pode melhorar a vida das pessoas. Seu avô, Helgo Abreu, mostrou que um grande líder é construído a partir de ideias e não apenas de cargos. Ao assumir o mandato, Arthur Halal deixou claro que seu compromisso é com o povo de Pelotas. O que move Arthur Halal é a esperança. A esperança de que a política pode ser diferente, de que o jovem tem voz e de que a experiência do dia a dia dos pelotenses é o melhor guia para construir leis e projetos que realmente funcionam. A renovação política que Pelotas tanto precisava finalmente chegou, e ela carrega o rosto de um jovem que acredita que o futuro começa hoje.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_2408a0b15bf1118b66aae5c040453306_74cbe606.jpg",
    category: "Mandato",
    status: "published",
    featured: true,
    importance: "high",
    author: "Arthur Halal",
    published_at: "2025-01-02T10:00:00.000Z",
  },
  {
    title: "R$ 1,5 Milhão em Recursos para Pelotas: Arthur Halal Garante Investimento Histórico na Limpeza de Rios e Drenagem",
    slug: "arthur-halal-garante-1-5-milhao-desassorear-rs",
    summary: "Vereador Arthur Halal conquista junto à Secretaria de Desenvolvimento Urbano e Metropolitano recursos que vão transformar a infraestrutura hídrica de Pelotas.",
    content: "Em uma conquista histórica para a infraestrutura de Pelotas, o vereador Arthur Halal anunciou no dia 12 de fevereiro de 2025 a liberação de R$ 1,5 milhão do programa Desassorear RS. O recurso, conquistado após intensa articulação junto à Secretaria de Desenvolvimento Urbano e Metropolitano, em Porto Alegre, será destinado integralmente à limpeza de rios, arroios, canais de drenagem e ao sistema pluvial da cidade. A notícia foi recebida com enorme satisfação pela população pelotense, que há anos enfrenta problemas de alagamento em diversos bairros durante períodos de chuva intensa. O investimento representa um marco na gestão de infraestrutura urbana da cidade. Os recursos serão aplicados em três frentes principais: a limpeza e desassoreamento dos rios que cortam a cidade, a manutenção e ampliação dos canais de drenagem existentes e a modernização do sistema pluvial em pontos críticos. Bairros historicamente afetados por alagamentos, como Fragata, Areal, Centro e Três Vendas, serão os principais beneficiados. Arthur Halal reafirmou que esta conquista é apenas o começo: 'Nosso compromisso é trabalhar todos os dias para trazer mais recursos, mais investimentos e mais qualidade de vida para o nosso povo.'",
    image_url: "https://public.readdy.ai/ai/img_res/edited_528c3803a76af89881636b400ff9eabc_74cbe606.jpg",
    category: "Infraestrutura",
    status: "published",
    featured: true,
    importance: "high",
    author: "Arthur Halal",
    published_at: "2025-02-12T10:00:00.000Z",
  },
  {
    title: "Investimento de R$ 1,5 Milhão é Confirmado: Arthur Halal Celebra Conquista para a Infraestrutura de Pelotas",
    slug: "investimento-1-5-milhao-confirmado-caff",
    summary: "O vereador Arthur Halal confirma oficialmente a liberação dos recursos do programa Desassorear RS para limpeza de rios e manutenção do sistema pluvial de Pelotas.",
    content: "Em solenidade realizada no Centro Administrativo Fernando Ferrari (CAFF), em Porto Alegre, o vereador Arthur Halal confirmou oficialmente no dia 20 de fevereiro de 2025 a liberação de R$ 1,5 milhão para o município de Pelotas. A cerimônia de confirmação contou com a presença de técnicos da Secretaria de Desenvolvimento Urbano e Metropolitano e representantes da Defesa Civil de Pelotas. Arthur Halal, visivelmente emocionado, recebeu o documento oficial de liberação de recursos. 'Hoje é um dia de celebração para Pelotas. Confirmamos que os R$ 1,5 milhão estão garantidos', declarou o vereador. As obras incluem o desassoreamento de mais de 12 quilômetros de rios e arroios, a limpeza de 28 bueiros e galerias pluviais obstruídos e a construção de novas caixas de passagem. A prefeitura de Pelotas se comprometeu a complementar o investimento com recursos municipais para manutenção preventiva.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_28d81c4651f83c820a7fa8b65914a7e5_74cbe606.jpg",
    category: "Infraestrutura",
    status: "published",
    featured: true,
    importance: "high",
    author: "Arthur Halal",
    published_at: "2025-02-20T10:00:00.000Z",
  },
  {
    title: "35ª Abertura Oficial da Colheita do Arroz: Arthur Halal Celebra a Força do Agro Pelotense",
    slug: "35-abertura-colheita-arroz-pelotas",
    summary: "O vereador prestigiou a 35ª Abertura Oficial da Colheita do Arroz, evento que consolida a importância do setor agropecuário para a economia do Rio Grande do Sul.",
    content: "A 35ª Abertura Oficial da Colheita do Arroz reuniu autoridades, produtores rurais e lideranças comunitárias no dia 20 de fevereiro de 2025. O vereador Arthur Halal marcou presença, reafirmando seu compromisso com o desenvolvimento do setor agropecuário de Pelotas. A cerimônia contou com a presença do Senador Heinze, do Vice-Governador Gabriel Souza e de diversas autoridades. 'O arroz não é apenas uma commodity. Para Pelotas, ele representa a sobrevivência de milhares de famílias e a tradição de gerações', afirmou Arthur Halal. O evento destacou os avanços tecnológicos do setor, com novas variedades de sementes e técnicas de manejo sustentável. Arthur Halal aproveitou para ouvir demandas dos produtores sobre melhorias de estradas rurais e acesso a crédito.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_b7f86f4ccb7547ddec75a7aa351a8a22_74cbe606.jpg",
    category: "Agricultura",
    status: "published",
    featured: true,
    importance: "high",
    author: "Arthur Halal",
    published_at: "2025-02-20T14:00:00.000Z",
  },
  {
    title: "Reajuste de 6,27% para os Professores de Pelotas é Aprovado na Câmara: Vitória da Educação",
    slug: "reajuste-magisterio-aprovado-camara",
    summary: "A Câmara de Vereadores aprova reajuste salarial para o magistério municipal, reafirmando o compromisso com uma educação de qualidade e valorização dos educadores.",
    content: "Em uma decisão histórica, a Câmara Municipal aprovou por unanimidade, na semana de 12 de março de 2025, o reajuste salarial de 6,27% para todos os professores da rede municipal de ensino. O vereador Arthur Halal foi um dos principais defensores da aprovação. 'O professor não é apenas um profissional. É um agente transformador que molda o futuro todos os dias', declarou. A aprovação resultou da articulação entre o Sindicato dos Trabalhadores em Educação, a Secretaria Municipal de Educação e a Câmara. Arthur Halal reconheceu que ainda há caminho a percorrer: 'O 6,27% é um avanço, mas não é o fim da luta. Seguimos trabalhando pelas condições justas para quem se dedica à educação.' Mais de 1.200 educadores serão beneficiados. Arthur Halal anunciou ainda um pacote de medidas complementares, incluindo capacitação contínua e reforma de escolas.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_1f0de37e74f8e8bc69684097f3eca5b4_74cbe606.jpg",
    category: "Educação",
    status: "published",
    featured: true,
    importance: "high",
    author: "Arthur Halal",
    published_at: "2025-03-12T10:00:00.000Z",
  },
  {
    title: "Arthur Halal em Brasília: R$ 600 Mil Conquistados para Pelotas em Apenas Um Dia",
    slug: "arthur-halal-brasilia-600-mil-pelotas",
    summary: "Em missão em Brasília, o vereador Arthur Halal já começa com excelentes notícias para a cidade, garantindo investimentos federais que beneficiarão a população.",
    content: "O primeiro dia de missão parlamentar do vereador Arthur Halal em Brasília já trouxe resultados concretos. No dia 18 de março de 2025, o parlamentar anunciou a conquista de R$ 600 mil em recursos federais, articulados junto ao Deputado Federal Pedro Westphalen. 'Cheguei a Brasília com uma agenda clara: trazer recursos para Pelotas. Em menos de 24 horas, já tenho R$ 600 mil confirmados', comemorou. Os recursos serão destinados a projetos de infraestrutura e ação social, com prioridade para bairros periféricos. Arthur Halal também visitou o gabinete do Senador Heinze e participou de audiência no Ministério do Desenvolvimento Regional sobre prevenção a enchentes. 'Não vou desistir de trazer cada centavo que Pelotas tem direito', afirmou.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_e0270bb8c0f0b795b4cd6a486e1a5a9e_74cbe606.jpg",
    category: "Política",
    status: "published",
    featured: true,
    importance: "high",
    author: "Arthur Halal",
    published_at: "2025-03-18T10:00:00.000Z",
  },
  {
    title: "R$ 600 Mil em Recursos Chegam para Pelotas: Infraestrutura, Saúde e Ação Social são Beneficiadas",
    slug: "600-mil-recursos-chegam-pelotas-infra-saude-social",
    summary: "Três importantes projetos pelotenses recebem investimentos: melhorias na Colônia Z3, laboratório de prótese dentária na UFPel e manutenção de entidades sociais.",
    content: "No dia 22 de março de 2025, o vereador Arthur Halal anunciou R$ 600 mil em investimentos para três setores: R$ 300 mil para infraestrutura da Colônia Z3 (recuperação de ruas, iluminação LED e drenagem), R$ 200 mil para o laboratório de prótese dentária da Odontologia da UFPel (atendendo o SUS), e R$ 100 mil para manutenção de duas entidades sociais. 'Não cheguei em lugar nenhum dizendo o que a comunidade precisa. Eu perguntei, ouvi e agora estou entregando', declarou Arthur Halal. A UFPel agradeceu o investimento, e as obras na Colônia Z3 têm licitação prevista em 60 dias. A estratégia de distribuir recursos em três áreas foi elogiada como gestão inteligente de recursos públicos.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_9f69a7421eb41c00a0dcef79291b5392_74cbe606.jpg",
    category: "Ação Social",
    status: "published",
    featured: true,
    importance: "high",
    author: "Arthur Halal",
    published_at: "2025-03-22T10:00:00.000Z",
  },
  {
    title: "Lei de Incentivos para a Moradia Digna é Aprovada: Arthur Halal Amplia o Acesso à Casa Própria em Pelotas",
    slug: "lei-incentivos-moradia-digna-aprovada-pelotas",
    summary: "A nova lei de incentivos fiscais para o programa Minha Casa, Minha Vida representa um avanço histórico na garantia do direito à moradia digna para as famílias pelotenses.",
    content: "No dia 1 de abril de 2025, a Câmara Municipal de Pelotas aprovou lei de incentivos fiscais para o programa Minha Casa, Minha Vida. A proposta de Arthur Halal cria isenção de taxas de alvará, redução de IPTU durante construção e compensação de créditos tributários para construtoras. 'Aprovar esta lei é dizer a cada família que sonha com a casa própria: a gente está do seu lado', afirmou. A lei impulsiona a economia local com geração de empregos na construção civil. A lista de espera por moradias em Pelotas supera 1.500 famílias. Arthur Halal anunciou também o 'Mutirão da Moradia', força-tarefa para acompanhar implementação e auxiliar famílias no cadastro.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_c0bab62f405e7658f248c92b31197d3b_74cbe606.jpg",
    category: "Habitação",
    status: "published",
    featured: true,
    importance: "medium",
    author: "Arthur Halal",
    published_at: "2025-04-01T10:00:00.000Z",
  },
  {
    title: "R$ 400 Mil para a Saúde de Pelotas: Arthur Halal Agradece Destinação do Senador Heinze",
    slug: "400-mil-saude-pelotas-senador-heinze",
    summary: "Recursos federais serão investidos em procedimentos de média e alta complexidade, reforçando o atendimento da Santa Casa de Pelotas e do Hospital Universitário.",
    content: "Em 15 de maio de 2025, Arthur Halal anunciou R$ 400 mil para a saúde de Pelotas, provenientes de emenda do Senador Luis Carlos Heinze. Os recursos vão para procedimentos de média e alta complexidade na Santa Casa e no Hospital Universitário da UFPel. 'R$ 400 mil em saúde significam mais cirurgias, mais exames e mais vidas salvas', declarou o vereador. A Santa Casa, que enfrenta dificuldades financeiras, usará os recursos para insumos cirúrgicos e medicamentos oncológicos. A conquista eleva para mais de R$ 3 milhões o total de recursos trazidos por Arthur Halal em menos de cinco meses de mandato. O vereador se comprometeu a buscar novas emendas para a saúde no segundo semestre.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_658d2f5203a889847ef616a4d667e261_74cbe606.jpg",
    category: "Saúde",
    status: "published",
    featured: true,
    importance: "high",
    author: "Arthur Halal",
    published_at: "2025-05-15T10:00:00.000Z",
  },
  {
    title: "R$ 520 Mil para Pelotas: Playgrounds nas Praças e Prótese Dentária na UFPel São Garantidos por Emenda de Westphalen",
    slug: "520-mil-playgrounds-protese-dentaria-ufpel",
    summary: "Deputado federal Pedro Westphalen destina R$ 520 mil para a cidade: R$ 420 mil para playgrounds modernos nas praças e R$ 100 mil para a fase 2 do projeto de prótese dentária da UFPel.",
    content: "No dia 28 de maio de 2025, o vereador Arthur Halal anunciou uma emenda de R$ 520 mil do deputado federal Pedro Westphalen para Pelotas. R$ 420 mil serão destinados à construção de playgrounds modernos e seguros em pelo menos 10 praças da cidade, com equipamentos certificados pelo Inmetro e pisos de borracha antichoque. R$ 100 mil vão para a fase 2 do projeto de prótese dentária da Odontologia da UFPel, dobrando a capacidade de atendimento do SUS. 'Trabalho e parceria que geram resultados reais para a nossa cidade', afirmou Arthur Halal. A seleção dos bairros para os playgrounds será feita por votação popular online. O projeto de prótese já atendeu mais de 200 pacientes e, com a fase 2, atenderá mais de 400 por mês.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_6ee5d1ea6324a27da75f56224e771bb1_bca78306.jpg",
    category: "Infraestrutura",
    status: "published",
    featured: true,
    importance: "high",
    author: "Arthur Halal",
    published_at: "2025-05-28T10:00:00.000Z",
  },
  {
    title: "Telemedicina em Pelotas: Arthur Halal Leva Proposta ao Prefeito para Modernizar o Acesso à Saúde e Reduzir Filas",
    slug: "telemedicina-pelotas-proposta-arthur-halal",
    summary: "O vereador apresenta projeto inovador de telemedicina para diminuir filas nas UBS e UPA, reduzir tempo de espera e trazer mais agilidade para consultas e atendimentos.",
    content: "No dia 28 de maio de 2025, o vereador Arthur Halal apresentou uma proposta inovadora para modernizar o sistema de saúde de Pelotas: a implantação de um programa de telemedicina que permitirá consultas médicas à distância, reduzindo as filas nas Unidades Básicas de Saúde e nas UPA da cidade. A proposta será levada pessoalmente ao prefeito Marroni. 'A saúde de Pelotas enfrenta longas filas nas UBS e UPA, demora para consultas e dificuldades no acesso ao atendimento. Não podemos ficar parados. A telemedicina é uma solução moderna, eficiente e que chega rapidamente a quem precisa', afirmou Arthur Halal. A proposta prevê consultas por videochamada para renovação de receitas, atestados, acompanhamento de hipertensos e diabéticos, além de totens de telemedicina em pontos estratégicos. Uma enquete mostrou que 78% dos pelotenses apoiam a iniciativa.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_95448bbf5cd382cd47d2384818cb613b_80919e1a.jpg",
    category: "Saúde",
    status: "published",
    featured: true,
    importance: "high",
    author: "Arthur Halal",
    published_at: "2025-05-28T14:00:00.000Z",
  },
  {
    title: "CPI do Sanep é Instalada: Arthur Halal Preside Comissão que Investiga Contratos Superfaturados",
    slug: "cpi-sanep-instalada-arthur-halal-preside",
    summary: "A Câmara de Pelotas instala oficialmente a Comissão Parlamentar de Inquérito para apurar denúncias de superfaturamento em contratos da companhia de saneamento.",
    content: "A CPI do Sanep foi oficialmente instalada na Câmara de Pelotas em 29 de maio de 2025, com Arthur Halal como presidente por ser o autor da proposta. A comissão investiga denúncias de superfaturamento em contratos de manutenção de redes de água e esgoto. 'Apresentei as denúncias com base em documentos e fatos. Não estou fazendo política partidária, estou defendendo o bolso do cidadão', afirmou. A relatoria ficou com Marcelo Bagé (PL) e a vice-presidência com Michel Promove (PP). A CPI terá poder de convocação e quebra de sigilo, com relatório em até 120 dias. 'Não vim à Câmara para ser decoração. Vim para fiscalizar e garantir que o dinheiro público seja tratado com respeito', declarou Arthur Halal.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_bc5ccdf3c5f6c2072a932dcc575e075f_74cbe606.jpg",
    category: "Transparência",
    status: "published",
    featured: true,
    importance: "high",
    author: "Arthur Halal",
    published_at: "2025-05-29T10:00:00.000Z",
  },
  {
    title: "R$ 2,19 Milhões para a Saúde de Pelotas: Arthur Halal e Deputado Guilherme Pasin Garantem Recorde Histórico na Operação Inverno",
    slug: "2-19-milhoes-saude-pelotas-pasin-operacao-inverno",
    summary: "Em parceria com o deputado Guilherme Pasin, Arthur Halal articula o maior investimento em saúde da história recente de Pelotas junto ao governo do Estado.",
    content: "No dia 11 de junho de 2025, Arthur Halal anunciou R$ 2.192.000,00 para a saúde de Pelotas, articulados em conjunto com o deputado estadual Guilherme Pasin junto ao governo do Estado na Operação Inverno Gaúcho com Saúde. O recurso, um dos maiores já destinados à saúde pelotense em um único repasse, será aplicado em aquisição de equipamentos médicos de alta complexidade para a Santa Casa, ampliação do atendimento ambulatorial no Hospital Universitário e compra de medicamentos para procedimentos de média e alta complexidade. 'Obrigado ao deputado Guilherme Pasin pela articulação em conjunto com o nosso mandato. Esse dinheiro vai se transformar em mais cirurgias, mais exames e mais vidas salvas', afirmou Arthur Halal. A Santa Casa, que atravessa grave crise financeira, será a principal beneficiada. A conquista eleva para mais de R$ 3 milhões o total de recursos para saúde em menos de seis meses.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_cf605e3d80b85e1e3f871e125bae73ec_80919e1a.jpg",
    category: "Saúde",
    status: "published",
    featured: true,
    importance: "high",
    author: "Arthur Halal",
    published_at: "2025-06-11T10:00:00.000Z",
  },
  {
    title: "Aprovado! Arthur Halal Celebra Construção de Duas Novas Estações de Tratamento de Esgoto em Pelotas",
    slug: "aprovadas-duas-novas-estacoes-tratamento-esgoto-pelotas",
    summary: "A Câmara de Pelotas aprova a construção das ETEs Simões Lopes e Engenho, beneficiando mais de 200 mil pessoas e elevando o saneamento da cidade.",
    content: "No dia 26 de junho de 2025, a Câmara Municipal de Pelotas aprovou a construção de duas novas Estações de Tratamento de Esgoto (ETEs): Simões Lopes e Engenho. A votação, com apoio de Arthur Halal, representa um avanço sem precedentes para o saneamento básico da cidade, beneficiando mais de 200 mil pessoas e elevando a taxa de tratamento de esgoto para 80%. 'Hoje demos um passo que Pelotas precisava há décadas. É garantir dignidade a cada família da nossa cidade', afirmou Arthur Halal. As ETEs vão ampliar a cobertura em bairros como Simões Lopes, Três Vendas, Engenho, Areal e Fragata. A obra vai gerar centenas de empregos e terá impacto ambiental positivo imediato, com recuperação dos rios da cidade. A UFPel se colocou à disposição para monitorar a qualidade da água. A prefeitura se comprometeu a integrar as ETEs ao Plano Municipal de Saneamento.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_66ed1a8afef63b7bebdcc4d29a2b8469_80919e1a.jpg",
    category: "Infraestrutura",
    status: "published",
    featured: true,
    importance: "high",
    author: "Arthur Halal",
    published_at: "2025-06-26T10:00:00.000Z",
  },
  {
    title: "Quase R$ 1 Milhão em Apenas 7 Meses: Arthur Halal Revela o Trabalho de Resultado pelo Povo de Pelotas",
    slug: "quase-1-milhao-7-meses-emendas-articuladas-pelotas",
    summary: "Balanço de resultados do mandato mostra R$ 982 mil em emendas articuladas em apenas 7 meses, com transparência total e trabalho junto a Heinze e Westphalen.",
    content: "No dia 14 de agosto de 2025, Arthur Halal apresentou um balanço de resultados com R$ 982 mil em emendas articuladas em apenas 7 meses de mandato. O valor é resultado de trabalho junto ao Senador Luiz Carlos Heinze e ao Deputado Federal Pedro Westphalen. Do total, R$ 400 mil foram para saúde (Heinze), R$ 520 mil para infraestrutura e saúde (Westphalen), e R$ 62 mil para ações sociais. 'Não venho falar de promessas. Venho falar de resultados. Em 7 meses, quase um milhão de reais já foi garantido para Pelotas. E isso é apenas o começo', afirmou Arthur Halal. O vereador anunciou que publicará mensalmente um relatório de investimentos. A live do balanço foi acompanhada por milhares de pessoas e a hashtag 'ArthurHalalTrabalha' viralizou na cidade. A comunidade política, incluindo adversários, reconheceu os resultados.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_3923908c34ba59793f7183851a9e155a_80919e1a.jpg",
    category: "Política",
    status: "published",
    featured: true,
    importance: "high",
    author: "Arthur Halal",
    published_at: "2025-08-14T10:00:00.000Z",
  },
  {
    title: "R$ 500 Mil para Pelotas: Emenda de Pedro Westphalen Vai Fortalecer Saúde, Educação e Segurança",
    slug: "500-mil-emenda-pedro-westphalen-saude-educacao-seguranca",
    summary: "Deputado federal Pedro Westphalen destina R$ 500 mil para Pelotas, divididos em saúde, educação e segurança, com articulação de Arthur Halal.",
    content: "No dia 23 de setembro de 2025, Arthur Halal anunciou uma emenda de R$ 500 mil do deputado federal Pedro Westphalen para Pelotas. Os recursos serão divididos em três áreas: R$ 200 mil para equipamentos médicos nas UBS dos bairros Fragata, Areal e Santa Terezinha; R$ 200 mil para reforma de 3 escolas municipais e compra de material didático e tecnológico; e R$ 100 mil para iluminação pública de LED e equipamentos da Guarda Municipal. 'Mais uma vez, o deputado Pedro Westphalen mostra que é um parceiro de verdade de Pelotas. R$ 500 mil que vai tocar a vida de milhares de pessoas', afirmou Arthur Halal. As secretarias municipais se comprometeram a criar um comitê gestor com transparência total. A população reagiu com entusiasmo, especialmente moradores dos bairros beneficiados.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_818127768330aa2667bf8a191eb9abae_80919e1a.jpg",
    category: "Política",
    status: "published",
    featured: true,
    importance: "high",
    author: "Arthur Halal",
    published_at: "2025-09-23T10:00:00.000Z",
  },
  {
    title: "R$ 500 Mil Confirmados: Arthur Halal Anuncia Investimentos para Saúde, Educação e Segurança de Pelotas",
    slug: "500-mil-confirmados-saude-educacao-seguranca-pelotas",
    summary: "Liberação oficial de R$ 500 mil em emendas para saúde, educação e segurança, com transparência total e acompanhamento do mandato.",
    content: "No dia 15 de outubro de 2025, Arthur Halal confirmou oficialmente a liberação de R$ 500 mil em emendas parlamentares para Pelotas, articuladas junto ao deputado federal Pedro Westphalen. Na saúde, R$ 200 mil serão investidos em equipamentos de diagnóstico para as UBS dos bairros Fragata, Areal e Santa Terezinha. Na educação, R$ 200 mil vão para compra de tablets, kits de robótica e livros didáticos para 15 escolas municipais. Na segurança, R$ 100 mil serão aplicados em câmeras de monitoramento em praças e ruas de bairros vulneráveis. 'O dinheiro está garantido. É documento assinado, é dinheiro na conta. Cada real vai ser transformado em saúde, educação e segurança para o nosso povo', afirmou Arthur Halal. A prefeitura se comprometeu a publicar a execução dos recursos em tempo real no portal da transparência. Arthur Halal anunciou uma audiência pública para 1º de novembro para apresentar o balanço anual de investimentos.",
    image_url: "https://public.readdy.ai/ai/img_res/edited_0e4da58211a907980fc907280d9e5479_bca78306.jpg",
    category: "Política",
    status: "published",
    featured: true,
    importance: "high",
    author: "Arthur Halal",
    published_at: "2025-10-15T10:00:00.000Z",
  },
];

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
  };

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Delete all existing news
    const { error: deleteError } = await supabase
      .from("news")
      .delete()
      .neq("id", -1);

    if (deleteError) {
      return new Response(JSON.stringify({ success: false, step: "delete", error: deleteError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert all 17 new news
    const { data, error: insertError } = await supabase
      .from("news")
      .insert(NEWS_DATA)
      .select("id, title, slug");

    if (insertError) {
      return new Response(JSON.stringify({ success: false, step: "insert", error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, inserted: data.length, news: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});