"""Gera arquivos de pesquisa; nao importa ou publica anuncios."""
import csv
import json
from pathlib import Path
import unicodedata

ROOT = Path(__file__).parent
BASE = "https://temlinkaqui.com"
groups = [
    ("catalogo", "whatsapp", "P1", "/rede/whatsapp", "Revisar os 6 cartoes observados e destinos; piloto apos validar conversao de saida", "grupos de whatsapp|links de grupos de whatsapp|grupo de whatsapp para entrar|encontrar grupos de whatsapp|buscar grupos de whatsapp|site de grupos de whatsapp|lista de grupos de whatsapp|grupos de whatsapp por categoria|comunidades de whatsapp|links de comunidades whatsapp|canais de whatsapp|encontrar canais de whatsapp"),
    ("catalogo", "ofertas", "P1", "/nicho/compras-ofertas-cupons", "Separar grupos/canais de produtos e conferir estoque de links relevante na landing", "grupos de ofertas|grupos de promocoes|grupos de cupons|grupos de descontos|grupo de ofertas whatsapp|grupo de promocoes whatsapp|grupo de cupons whatsapp|grupo de achadinhos whatsapp|comunidade de ofertas whatsapp|canal de ofertas whatsapp|canal de promocoes whatsapp|grupos de compras whatsapp"),
    ("catalogo", "telegram", "P2", "/rede/telegram", "Ampliar inventario: somente 1 cartao observado; nao prometer variedade ou links ativos", "grupos de telegram|grupos do telegram|links de grupos telegram|grupos telegram brasil|encontrar grupos telegram|buscar grupos no telegram|site de grupos telegram|lista de grupos telegram|grupos telegram por categoria|comunidades telegram|canais telegram|canais do telegram|encontrar canais telegram|links de canais telegram|lista de canais telegram|canais telegram brasil"),
    ("catalogo", "ofertas-telegram", "P2", "/rede/telegram", "Validar o unico cartao observado antes de investir", "grupo de ofertas telegram|grupo de promocoes telegram|grupo de cupons telegram|grupo de descontos telegram|grupo de achadinhos telegram|canal de ofertas telegram|canal de promocoes telegram|canal de cupons telegram|canal de descontos telegram|comunidade de ofertas telegram"),
    ("catalogo", "ofertas-segmentadas", "P2", "/nicho/compras-ofertas-cupons", "Somente com comunidades do segmento; nao tratar anuncio de produto como grupo de ofertas", "grupo de ofertas de tecnologia|grupo de ofertas de celulares|grupo de ofertas de informatica|grupo de ofertas de games|grupo de ofertas para casa|grupo de ofertas de livros|grupo de cupons de lojas|canal de achadinhos|comunidade de cupons|grupos de descontos online|grupo de ofertas de suplementos|grupo de promocoes fitness"),
    ("catalogo", "estudos", "P3", "", "Backlog: confirmar comunidades e landing de estudos antes de anunciar", "grupo de estudos whatsapp|grupo de estudos telegram|grupo de enem whatsapp|grupo de enem telegram|grupo de vestibular whatsapp|grupo de vestibular telegram|grupo de concursos whatsapp|grupo de concursos telegram|grupo de ingles whatsapp|grupo de ingles telegram|grupo de programacao whatsapp|grupo de programacao telegram|grupo de matematica whatsapp|grupo de redacao telegram"),
    ("catalogo", "tecnologia-games", "P3", "", "Backlog: confirmar grupos correspondentes; termos gerais de jogos nao sao equivalentes", "grupo de tecnologia whatsapp|grupo de tecnologia telegram|comunidade de programadores|grupo de desenvolvedores whatsapp|grupo de desenvolvedores telegram|grupo de javascript telegram|grupo de python telegram|grupo de games whatsapp|grupo de games telegram|comunidade gamer whatsapp|grupo de jogos de tabuleiro whatsapp|grupo de jogos de tabuleiro telegram"),
    ("catalogo", "hobbies-comunidades", "P3", "", "Backlog: exigir inventario e pagina especifica; nao publicar todos os temas de uma vez", "grupo de livros whatsapp|grupo de leitura telegram|clube do livro whatsapp|clube do livro telegram|grupo de fotografia whatsapp|grupo de fotografia telegram|grupo de corrida whatsapp|grupo de ciclismo whatsapp|grupo de jardinagem whatsapp|grupo de culinaria telegram|grupo de musica whatsapp|grupo de artesanato whatsapp"),
    ("publicadores", "divulgar-telegram", "P2", "/divulgar", "Campanha separada de aquisicao de publicadores; usar conversao de envio aceito", "divulgar grupo telegram|divulgar canal telegram|onde divulgar grupo telegram|onde divulgar canal telegram|site para divulgar grupo telegram|site para divulgar canal telegram|cadastrar grupo telegram|cadastrar canal telegram|adicionar grupo telegram em site|publicar grupo telegram|divulgar grupo telegram gratis|divulgar canal telegram gratis"),
    ("publicadores", "divulgar-whatsapp", "P2", "/divulgar", "Campanha separada de aquisicao de publicadores; publicacao gratis sem promessa de membros", "divulgar grupo whatsapp|divulgar comunidade whatsapp|divulgar canal whatsapp|onde divulgar grupo whatsapp|site para divulgar grupo whatsapp|site para divulgar comunidade whatsapp|cadastrar grupo whatsapp|cadastrar comunidade whatsapp|adicionar grupo whatsapp em site|publicar grupo whatsapp|divulgar grupo whatsapp gratis|divulgar canal whatsapp gratis"),
    ("publicadores", "divulgacao-geral", "P3", "/divulgar", "Validar custo e intencao: mais amplo que donos de grupos; campanha propria", "site para divulgar links|onde divulgar links|publicar link gratis|cadastrar link gratis|divulgar comunidade online|divulgar grupo de ofertas|divulgar canal de ofertas|cadastrar grupo de promocoes|divulgar comunidade de estudos|diretorio de comunidades|site de divulgacao de grupos|divulgar meu grupo"),
    ("marca", "tem-link-aqui", "P3", "/", "Separar marca de aquisicao; confirmar demanda antes de reservar verba", "tem link aqui|temlinkaqui|temlinkaqui com|tem link aqui grupos"),
    ("concorrentes", "navegacional", "NAO_INICIAR", "", "Termos de terceiros: pesquisar no Planejador; nao usar marcas na copy nem sugerir afiliacao", "telegrupos|telegruposbrasil|tele grupos brasil|grupos de tg|megagrupos|grupodewhatsapp"),
]

columns = ["objetivo", "grupo", "palavra_chave", "prioridade", "correspondencia_sugerida", "url_proposta", "condicao_para_ativar", "origem", "volume_mensal", "cpc", "concorrencia"]
rows = []
for objective, group, priority, url, condition, words in groups:
    for word in words.split("|"):
        rows.append(dict(zip(columns, [objective, group, word, priority, "EXACT" if objective in ("marca", "concorrentes") else "PHRASE", BASE + url if url else "", condition, "hipotese_editorial_por_intencao_sem_volume_medido", "", "", ""])))
assert len({r["palavra_chave"] for r in rows}) == len(rows)
assert all(r["prioridade"] != "P1" or r["url_proposta"] for r in rows)
with (ROOT / "palavras-chave-pesquisa.csv").open("w", newline="", encoding="utf-8-sig") as output:
    writer = csv.DictWriter(output, fieldnames=columns)
    writer.writeheader()
    writer.writerows(rows)
(ROOT / "sementes-planejador.txt").write_text("\n".join(r["palavra_chave"] for r in rows if r["prioridade"] != "NAO_INICIAR") + "\n", encoding="utf-8")

negative_groups = [
    ("intencao-adulta", "PHRASE", "Candidatas a excluir da campanha geral; revisar politica e landing inteira", "pornografia|porno|pornô|porn|nudes|nude|sexo explicito|sexo explícito|conteudo adulto|conteúdo adulto|telegram adulto|whatsapp adulto|grupo adulto|grupos adultos|onlyfans|privacy vazado|vazados|vazadas|telegram 18|grupos 18|whatsapp 18"),
    ("suporte-app", "PHRASE", "Excluir procura por aplicativo, suporte ou software; nao excluir telegram/whatsapp em frase", "baixar telegram|baixar whatsapp|download telegram|download whatsapp|telegram apk|whatsapp apk|whatsapp gb|gb whatsapp|recuperar conta|recuperar senha|codigo de verificacao|código de verificação|telegram nao funciona|whatsapp nao funciona|whatsapp fora do ar|suporte telegram|suporte whatsapp|instalar telegram|instalar whatsapp"),
    ("genericos-isolados", "EXACT", "Exata apenas: preservar buscas como grupos de whatsapp e grupos de promocoes", "telegram|whatsapp|promos|promocoes|promoções|cupom|cupons|desconto|descontos"),
    ("direitos-e-abuso", "PHRASE", "Candidatas fora do piloto; revisar relatorio de termos e evitar bloqueios excessivos", "filme completo gratis|filme completo grátis|filmes piratas|series piratas|séries piratas|iptv pirata|iptv gratis|iptv grátis|crack download|contas roubadas|cartao clonado|cartão clonado|clonar whatsapp|invadir whatsapp|hackear whatsapp|dados vazados|cpf vazado"),
    ("apostas-fora-piloto", "PHRASE", "Nao misturar com comunidades/ofertas; produtos regulados demandam analise propria", "tigrinho|jogo do tigrinho|cassino online|casino online|roleta online|sinais de aposta|sinais de apostas|apostas esportivas|ganho garantido|renda garantida"),
]
negatives = []
for group, match, reason, words in negative_groups:
    for word in words.split("|"):
        negatives.append({"grupo": group, "palavra_chave_negativa": word, "correspondencia": match, "escopo": "campanha_catalogo_proposta", "motivo": reason})
assert len({(n["palavra_chave_negativa"], n["correspondencia"]) for n in negatives}) == len(negatives)
assert not any(n["palavra_chave_negativa"] in ("gratis", "grátis", "grupo", "grupos", "link", "links") for n in negatives)
with (ROOT / "negativas-para-revisar.csv").open("w", newline="", encoding="utf-8-sig") as output:
    writer = csv.DictWriter(output, fieldnames=list(negatives[0]))
    writer.writeheader()
    writer.writerows(negatives)
summary = "\n".join(f"- {group}: {sum(r['grupo'] == group for r in rows)}" for _, group, *_ in groups)
(ROOT / "contagem.txt").write_text(f"{len(rows)} candidatas; {len(negatives)} negativas candidatas. Nada publicado.\n{summary}\n", encoding="utf-8")
print(f"{len(rows)} candidatas; {sum(r['prioridade'] == 'P1' for r in rows)} no nucleo inicial; {len(negatives)} negativas candidatas.")

def normalized(value):
    return "".join(c for c in unicodedata.normalize("NFD", value.casefold()) if not unicodedata.combining(c))

with (ROOT / "metricas-observadas.csv").open(encoding="utf-8-sig", newline="") as source:
    observed = list(csv.DictReader(source))
assert all(len(row) == 13 and None not in row for row in observed)
lookup = {normalized(row["palavra_chave"]): row for row in observed}
assert len(lookup) == len(observed)
extra = ["lance_topo_menor_brl", "lance_topo_maior_brl", "periodo_metricas", "recorte_metricas"]
for row in rows:
    match = lookup.get(normalized(row["palavra_chave"]))
    row.update({key: "" for key in extra})
    if match:
        row.update(volume_mensal=match["pesquisas_mensais_media"], concorrencia=match["concorrencia"], origem="Planejador Google Ads observado em 20/10/2026; prioridade editorial", lance_topo_menor_brl=match["lance_topo_menor_brl"], lance_topo_maior_brl=match["lance_topo_maior_brl"], periodo_metricas=match["periodo"], recorte_metricas="Brasil;Portugues;Google")
with (ROOT / "palavras-chave-pesquisa.csv").open("w", newline="", encoding="utf-8-sig") as output:
    writer = csv.DictWriter(output, fieldnames=columns + extra)
    writer.writeheader()
    writer.writerows(rows)
ads = json.loads((ROOT / "anuncios-rascunho.json").read_text(encoding="utf-8"))
for ad in ads:
    assert len(ad["titulos"]) <= 15 and len(ad["descricoes"]) <= 4
    assert all(len(text) <= 30 for text in ad["titulos"])
    assert all(len(text) <= 90 for text in ad["descricoes"])
    assert ad["status"] == "RASCUNHO_LOCAL_NAO_PUBLICADO"
print(f"{len(observed)} palavras com metricas observadas; {sum(bool(r['volume_mensal']) for r in rows)} candidatas enriquecidas; limites de texto dos 2 anuncios conferidos.")
