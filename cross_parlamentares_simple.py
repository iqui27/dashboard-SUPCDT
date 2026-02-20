import csv

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

def main():
    print("=== ANÁLISE DE PARLAMENTARES (CSV) ===\n")
    
    # Do CSV
    csv_parlamentares = get_parlamentares_from_csv()
    print(f"📊 Total de parlamentares únicos no CSV: {len(csv_parlamentares)}")
    
    print(f"\n📋 Lista completa de parlamentares:")
    for i, parlamentar in enumerate(csv_parlamentares, 1):
        print(f"   {i:2d}. {parlamentar}")
    
    # Análise de nomes similares (possíveis duplicatas)
    print(f"\n🔍 ANÁLISE DE NOMES SIMILARES (possíveis duplicatas):")
    
    # Normalizar nomes para análise
    normalized_names = {}
    for name in csv_parlamentares:
        # Remover acentos, converter para minúsculo, remover espaços extras
        normalized = name.lower().replace('pastor', '').replace('doutor', '').strip()
        normalized = ''.join(c for c in normalized if c.isalnum() or c.isspace())
        normalized = ' '.join(normalized.split())
        
        if normalized not in normalized_names:
            normalized_names[normalized] = []
        normalized_names[normalized].append(name)
    
    # Encontrar possíveis duplicatas
    duplicates = {k: v for k, v in normalized_names.items() if len(v) > 1}
    
    if duplicates:
        print("   ⚠️  Possíveis duplicatas encontradas:")
        for normalized, names in duplicates.items():
            print(f"   -> '{normalized}': {', '.join(names)}")
    else:
        print("   ✅ Nenhuma duplicata óbvia encontrada")
    
    # Estatísticas
    print(f"\n📈 ESTATÍSTICAS:")
    print(f"   Total de parlamentares: {len(csv_parlamentares)}")
    print(f"   Possíveis duplicatas: {sum(len(names) - 1 for names in duplicates.values())}")
    print(f"   Únicos após deduplicação: {len(csv_parlamentares) - sum(len(names) - 1 for names in duplicates.values())}")

if __name__ == "__main__":
    main()
