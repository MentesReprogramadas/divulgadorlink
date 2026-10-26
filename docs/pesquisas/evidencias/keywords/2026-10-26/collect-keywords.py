"""Public keyword reconnaissance; suggestions are not search-volume estimates."""
import concurrent.futures
import datetime
import json
from pathlib import Path
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent

NETWORK_SEEDS = {
    'whatsapp': ['grupos whatsapp', 'canais whatsapp', 'grupo de ofertas whatsapp', 'grupo de achadinhos', 'grupo whatsapp amizade', 'grupo whatsapp figurinhas'],
    'telegram': ['grupos telegram', 'links telegram', 'canais telegram', 'grupo telegram amizade', 'grupos telegram livros', 'telegram ofertas'],
    'discord': ['servidores discord', 'discord brasileiro', 'discord amizade', 'discord jogos', 'discord anime'],
    'facebook': ['grupos facebook', 'grupos facebook vendas'],
    'instagram': ['perfis instagram', 'instagram achadinhos'],
    'kwai': ['kwai criadores', 'kwai conteudo'],
    'linkedin': ['linkedin profissionais', 'linkedin vagas'],
    'pinterest': ['pinterest ideias', 'pinterest moda'],
    'reddit': ['comunidades reddit', 'reddit brasil'],
    'site': ['sites de ofertas', 'sites uteis'],
    'threads': ['threads perfis', 'threads comunidades'],
    'tiktok': ['tiktok criadores', 'tiktok achadinhos'],
    'twitch': ['twitch streamers brasileiros', 'twitch canais'],
    'vimeo': ['vimeo filmes', 'vimeo criadores'],
    'x': ['twitter perfis', 'twitter comunidades'],
    'youtube': ['canais youtube', 'youtube canais brasileiros'],
    'fansly': ['fansly criadores'],
    'fatal-model': [],
    'onlyfans': ['onlyfans criadores'],
    'privacy': ['privacy criadores'],
}

NICHE_SEEDS = {
    'adulto': ['telegram adulto', 'telegram +18', 'telegram porno', 'grupos adultos telegram', 'canais adultos telegram', 'grupos whatsapp adulto', 'conteudo adulto', 'criadores conteudo adulto'],
    'apostas': ['grupos apostas telegram', 'grupo palpites futebol', 'grupo tips futebol', 'grupo sinais apostas', 'grupos apostas whatsapp'],
    'esportes': ['grupos esportes', 'grupo corrida', 'grupo academia whatsapp'],
    'ganhar-dinheiro': ['grupo renda extra', 'grupo ganhar dinheiro', 'renda extra whatsapp'],
    'compras-ofertas-cupons': ['grupos de ofertas', 'grupo promocoes', 'grupo cupons', 'grupo achadinhos shopee', 'grupo ofertas amazon', 'grupo ofertas mercado livre'],
    'divulgacao-marketing': ['grupo divulgacao whatsapp', 'grupo marketing digital', 'grupo divulgacao telegram'],
    'filmes-series': ['grupos filmes telegram', 'grupos series telegram', 'comunidade cinema'],
    'streaming': ['comunidade streaming', 'grupo streaming'],
    'jogos': ['discord minecraft', 'discord roblox', 'discord valorant', 'grupo jogos whatsapp'],
    'servicos-ferramentas': ['ferramentas inteligencia artificial', 'sites ferramentas gratis'],
    'tecnologia-internet': ['grupo tecnologia telegram', 'grupo programacao', 'comunidade inteligencia artificial'],
    'educacao-cursos': ['grupo estudos whatsapp', 'grupos concursos telegram', 'grupo enem', 'grupo ingles whatsapp'],
    'saude-bem-estar': ['grupo fitness whatsapp', 'grupo emagrecimento', 'grupo saude mental'],
    'moda-beleza': ['grupo moda feminina', 'grupo maquiagem', 'grupo beleza whatsapp'],
    'afiliados-monetizacao': ['grupo afiliados shopee', 'grupo afiliados amazon', 'grupo afiliados mercado livre'],
    'marketplace-vendas-diretas': ['grupo compra e venda whatsapp', 'grupo vendas', 'grupo desapego'],
    'futebol': ['grupo futebol whatsapp', 'grupo flamengo whatsapp', 'grupo corinthians whatsapp'],
    'musicas': ['grupo musica whatsapp', 'grupo kpop whatsapp', 'grupo rock whatsapp'],
    'entretenimento-geral': ['grupo memes whatsapp', 'grupo humor', 'grupo figurinhas'],
    'financas-investimentos': ['grupo investimentos telegram', 'grupo criptomoedas', 'grupo financas'],
    'politica-sociedade': ['grupo politica whatsapp', 'grupo noticias telegram'],
    'apps-redes-plataformas': ['grupo redes sociais', 'grupo criadores de conteudo'],
    'animes-nerd-geek': ['grupo anime whatsapp', 'discord anime brasil', 'grupo manga'],
    'amizade-relacionamentos': ['grupo amizade whatsapp', 'grupo namoro telegram', 'grupo conversa whatsapp'],
    'servicos-profissionais': ['grupo vagas emprego whatsapp', 'grupo freelancers', 'grupo networking'],
}

EXPANSION_SEEDS = {
    'pets': ['grupo pets whatsapp', 'grupo animais whatsapp'],
    'religiao': ['grupo evangelico whatsapp', 'grupo oracao whatsapp'],
    'culinaria': ['grupo receitas whatsapp', 'grupo culinaria'],
    'carros-motos': ['grupo carros whatsapp', 'grupo motos whatsapp'],
    'viagens': ['grupo viagens whatsapp', 'grupo turismo'],
    'livros': ['grupo leitura whatsapp', 'grupo livros telegram'],
    'noticias': ['canais noticias telegram'],
    'lgbtqia-comunidade': ['grupo amizade lgbt whatsapp'],
}


def read_json(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode('utf-8'))


def suggestion_job(job):
    kind, slug, seed = job
    url = 'https://suggestqueries.google.com/complete/search?' + urllib.parse.urlencode({
        'client': 'firefox', 'hl': 'pt-BR', 'gl': 'BR', 'q': seed,
    })
    result = {'kind': kind, 'slug': slug, 'seed': seed, 'source_url': url}
    try:
        data = read_json(url)
        result['suggestions'] = [value for value in data[1] if isinstance(value, str)]
        result['status'] = 'ok'
    except (OSError, ValueError, IndexError, TypeError) as error:
        result.update(status='error', suggestions=[], error=str(error))
    return result


def main():
    home = read_json('https://temlinkaqui.com/bff/v1/home')
    taxonomy = {kind: [
        {key: row[key] for key in ('name', 'slug', 'requiresAge') if key in row}
        for row in home[kind]
    ] for kind in ('networks', 'niches')}
    assert {r['slug'] for r in taxonomy['networks']} == set(NETWORK_SEEDS)
    assert {r['slug'] for r in taxonomy['niches']} == set(NICHE_SEEDS)
    jobs = [(kind, slug, seed) for kind, groups in (
        ('network', NETWORK_SEEDS), ('niche', NICHE_SEEDS), ('expansion', EXPANSION_SEEDS)
    ) for slug, seeds in groups.items() for seed in seeds]
    assert len(jobs) == len(set(jobs))
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        results = list(executor.map(suggestion_job, jobs))
    data = {
        'collected_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'locale_requested': {'language': 'pt-BR', 'country': 'BR'},
        'method': 'Public Google autocomplete, no account or personal cookies; server location uncontrolled; not a search-volume source.',
        'trends': {'status': 'unavailable', 'reason': 'Initial public explore request returned HTTP 429; no retries or bypass.'},
        'monthly_search_volume': None,
        'taxonomy': taxonomy,
        'coverage_exclusions': {'fatal-model': 'Brand inventoried; no collection of terms promoting paid sexual services.'},
        'results': results,
    }
    (ROOT / 'autocomplete.json').write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding='utf-8')
    unique = {s for row in results for s in row['suggestions']}
    print(json.dumps({'networks': len(taxonomy['networks']), 'niches': len(taxonomy['niches']),
        'queries': len(jobs), 'ok': sum(r['status']=='ok' for r in results),
        'empty': sum(r['status']=='ok' and not r['suggestions'] for r in results),
        'unique_suggestions': len(unique)}, ensure_ascii=True), flush=True)
    for kind, groups in [('network', NETWORK_SEEDS), ('niche', NICHE_SEEDS), ('expansion', EXPANSION_SEEDS)]:
        for slug in groups:
            suggestions = list(dict.fromkeys(s for r in results if r['kind']==kind and r['slug']==slug for s in r['suggestions']))
            print(json.dumps({'kind': kind, 'slug': slug, 'suggestions': suggestions[:16]}, ensure_ascii=True), flush=True)


if __name__ == '__main__':
    main()
