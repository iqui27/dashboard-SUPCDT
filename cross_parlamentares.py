import csv
import json
import requests
import os

# Função para extrair parlamentares do CSV
def get_parlamentares_from_csv():
    parlamentares = set()
    
    with open('2025 - CONTROLE INTERNO_ SUAG  - fomentos 2025.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            parlamentar = row.get('PARLAMENTAR', '').strip()
            if parlamentar and parlamentar.lower() != 'parlamentar':
                parlamentares.add(parlamentar)
    
    return sorted(list(parlamentares))

# Função para tentar obter parlamentares da API (se disponível)
def get_parlamentares_from_api():
    try:
        # Tentar obter da API de fomentos
        response = requests.get('http://localhost:3001/api/fomentos', timeout=5)
        if response.status_code == 200:
            fomentos = response.json()
            parlamentares = set()
            for fomento in fomentos:
                if fomento.get('parlamentar'):
                    parlamentares.add(fomento['parlamentar'].strip())
                # Também verificar parlamentares array
                if fomento.get('parlamentares'):
                    for parlamentar_info in fomento['parlamentares']:
                        if parlamentar_info.get('nome'):
                            parlamentares.add(parlamentar_info['nome'].strip())
            
            return sorted(list(parlamentares))
    except:
        pass
    
    return []

# Função para tentar obter parlamentares da API de OSCs
def get_parlamentares_from_oscs():
    try:
        response = requests.get('http://localhost:3001/api/oscs', timeout=5)
        if response.status_code == 200:
            oscs = response.json()
            parlamentares = set()
            for osc in oscs:
                if osc.get('parlamentar'):
                    parlamentares.add(osc['parlamentar'].strip())
            
            return sorted(list(parlamentares))
    except:
        pass
    
    return []

def main():
    print("=== CRUZAMENTO DE PARLAMENTARES ===\n")
    
    # Do CSV
    csv_parlamentares = get_parlamentares_from_csv()
    print(f"📊 Parlamentares no CSV: {len(csv_parlamentares)}")
    
    # Da API de Fomentos
    api_parlamentares = get_parlamentares_from_api()
    print(f"🗄️  Parlamentares no BD (Fomentos): {len(api_parlamentares)}")
    
    # Da API de OSCs
    oscs_parlamentares = get_parlamentares_from_oscs()
    print(f"🏢 Parlamentares no BD (OSCs): {len(oscs_parlamentares)}")
    
    # Unir todos
    all_parlamentares = set(csv_parlamentares + api_parlamentares + oscs_parlamentares)
    print(f"\n🎯 Total de parlamentares únicos (todas as fontes): {len(all_parlamentares)}")
    
    # Análise
    csv_set = set(csv_parlamentares)
    api_set = set(api_parlamentares)
    oscs_set = set(oscs_parlamentares)
    
    only_in_csv = csv_set - api_set - oscs_set
    only_in_api = api_set - csv_set - oscs_set
    only_in_oscs = oscs_set - csv_set - api_set
    
    print(f"\n📈 ANÁLISE:")
    print(f"   Apenas no CSV: {len(only_in_csv)}")
    print(f"   Apenas no BD (Fomentos): {len(only_in_api)}")
    print(f"   Apenas no BD (OSCs): {len(only_in_oscs)}")
    
    if only_in_csv:
        print(f"\n📋 Parlamentares apenas no CSV:")
        for i, p in enumerate(sorted(only_in_csv), 1):
            print(f"   {i:2d}. {p}")
    
    if only_in_api:
        print(f"\n🗄️  Parlamentares apenas no BD (Fomentos):")
        for i, p in enumerate(sorted(only_in_api), 1):
            print(f"   {i:2d}. {p}")
    
    if only_in_oscs:
        print(f"\n🏢 Parlamentares apenas no BD (OSCs):")
        for i, p in enumerate(sorted(only_in_oscs), 1):
            print(f"   {i:2d}. {p}")
    
    print(f"\n✅ Lista completa de parlamentares únicos:")
    for i, parlamentar in enumerate(sorted(all_parlamentares), 1):
        sources = []
        if parlamentar in csv_set: sources.append("CSV")
        if parlamentar in api_set: sources.append("BD-F")
        if parlamentar in oscs_set: sources.append("BD-O")
        
        print(f"   {i:2d}. {parlamentar} ({', '.join(sources)})")

if __name__ == "__main__":
    main()
