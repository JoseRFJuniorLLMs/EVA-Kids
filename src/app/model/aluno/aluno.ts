
// (Opcional) Interface auxiliar para clareza nas referências de responsáveis
interface ResponsavelRef {
  pessoaRef: string | null; // ID referência para /pessoas/{cdpesResponsavel}
  tipoRelacaoRef: string | null; // ID referência para /tiposRelacao/{cdtip}
  responsavel: boolean;
  autorizadoBuscar: boolean;
  obs: string | null;
}

export interface Aluno {
  _id?: string; // ID do documento (opcional)
  cdpes: number; // PK original do SQL

  // --- Dados Pessoais ---
  nome: string;
  nomeNormalizado?: string; // Campo derivado para busca
  nomeSocial?: string | null;
  apelido?: string | null;
  fantasia?: string | null; // Adicionado
  dtnasc: Date | string | null;
  dtobito?: Date | string | null;
  sexo?: 'M' | 'F' | null; // Ou string, se houver outros valores
  estadoCivilRef?: string | null; // ID referência para /estadosCivis/{cdestciv}
  racaCorRef?: string | null; // ID referência para /racas/{cdrac}
  tipoSanguineo?: string | null;
  nacionalidade?: {
    paisOrigemRef: string | null; // ID referência para /paises/{cdpaiorig}
    anoChegada?: number | null;
    naturalizado?: boolean;
  } | null;
  naturalidade?: {
    cidadeRef: string | null; // ID referência para /cidades/{cdcidnat}
  } | null;
  fotoUrl?: string | null; // Mapeado de cdane ou campo específico
  dtcad: Date | string; // Data de cadastro original
  ultimaAtualizacao?: Date | string; // Gerenciado pela aplicação
  ativo?: boolean; // Gerenciado pela aplicação ou derivado
  observacoesGerais?: string | null; // de public.pessoa.obs

  // --- Documentos ---
  cpf?: string | null;
  rg?: {
    numero: string | null;
    complemento?: string | null;
    orgaoEmissor?: string | null;
    ufRef?: string | null; // ID referência para /ufs/{dcrguf}
    dataEmissao?: Date | string | null;
  } | null;
  certidao?: {
    tipo?: 'N' | 'C' | string | null; // Nascimento, Casamento, etc.
    numeroNovo: string | null; // Matrícula
    numeroAntigo?: string | null; // Se aplicável
    livro?: string | null;
    folha?: string | null;
    dataEmissao?: Date | string | null;
    cartorioCidadeRef?: string | null; // ID referência para /cidades/{cidcartorio}
    cartorioUfRef?: string | null; // ID referência para /ufs/{dcccartoriouf}
  } | null;
  tituloEleitor?: {
    numero: string | null;
    zona?: string | null;
    secao?: string | null;
    cidadeRef?: string | null; // ID referência para /cidades/{dctcidtitulo}
    ufRef?: string | null; // ID referência para /ufs/{dctuftitulo}
  } | null;
  outrosDocumentos?: {
    carteiraProfissional?: { // Mapeando dccartprof e dccpserie
        numero: string | null;
        serie: string | null;
    } | null;
    reservista?: { // Mapeando dcreservista, dcrunidade, dcrcertisento, dcrregiao
        numero: string | null;
        unidade?: string | null;
        certificadoIsento?: string | null; // Ou boolean?
        regiaoMilitar?: string | null;
    } | null;
    pisPasep?: string | null;
    inepId?: string | null;
    nis?: string | null;
    susCartao?: string | null;
    cnh?: { // Mapeando dccnh e dccnhcat
        numero: string | null;
        categoria?: string | null;
    } | null;
    passaporte?: string | null;
  } | null;

  // --- Endereço ---
  enderecoPrincipal?: {
    logradouro: string | null;
    numero: string | null;
    complemento?: string | null;
    referencia?: string | null;
    cep: string | null;
    bairroRef: string | null; // ID referência para /bairros/{cdbai}
    latitude?: number | null; // Adicionado
    longitude?: number | null; // Adicionado
    latLongManual?: boolean; // Adicionado
  } | null;
  enderecoTrabalho?: string | null; // Campo simples no SQL

  // --- Contato ---
  // Estrutura sugerida para abranger os campos SQL
  contatos?: Array<{
    tipo: 'telefone_residencial' | 'telefone_celular' | 'email_principal' | 'telefone_trabalho';
    valor: string; // Número do telefone ou endereço de email
    ddd?: number | null; // Para telefones
    principal?: boolean; // Para diferenciar fone1/fone2/email principal
  }> | null;

  // --- Filiação / Responsáveis ---
  // Usando a interface auxiliar definida no início
  responsaveisRefs?: Array<ResponsavelRef> | null; // Baseado em public.relacao

  // --- Saúde ---
  pcd?: boolean; // Derivado?
  necessidadesEspeciaisRefs?: Array<string> | null; // IDs referência para /patologias/{cdpat}
  alergiasRefs?: Array<string> | null; // IDs referência para /itens/{cdite}
  usaMedicacaoContinua?: boolean | null; // Baseado em medespecial?
  medicacaoDescricao?: string | null; // Baseado em medespecial?
  gestante?: boolean;
  dataProvavelParto?: Date | string | null;
  imcHistoricoRefs?: Array<string> | null; // IDs referência para coleção /imcs/{id_imc}

  // --- Informações Escolares (Aluno) ---
  matriculaAtualRef?: string | null; // ID referência para /matriculas/{id_matricula_ativa}
  bolsaFamilia?: boolean; // de alubolsa
  pim?: boolean; // de alupim
  transporteNecessario?: boolean; // Derivado?
  acolhimento?: string | null; // de sitacolhimento
  programasSociais?: boolean; // de benprogsoc
  aee?: {
    cognitivo?: boolean; // de aeecog
    autonomia?: boolean; // de aeeaut
    enriquecimento?: boolean; // de aeeenr
    informatica?: boolean; // de aeeinf
    libras?: boolean; // de aeelib
    portugues?: boolean; // de aeeport
    soroban?: boolean; // de aeesor
    braille?: boolean; // de aeebra
    mobilidade?: boolean; // de aeemob
    caa?: boolean; // de aeecaa
    recursos?: boolean; // de aeerec
  } | null;

  // --- Outros ---
  rendaFamiliar?: number | null; // Calcular?
  numeroIntegrantesFamilia?: number | null; // de nrointfam?
  login?: string | null; // de usuario
  status?: string; // Derivado? (Ativo, Inativo, etc.)
  papeis?: Array<'aluno' | 'responsavel' | 'professor' | string>; // Adicionado para identificar o tipo de pessoa

}
