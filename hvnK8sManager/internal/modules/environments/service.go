package environments

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"regexp"
	"strings"

	corev1 "k8s.io/api/core/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/util/validation"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/kubernetes"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	dynamicresources "hvnK8sManager/internal/dynamic-resources"
)

type Service struct {
	client        *kubernetes.Clientset
	dynamicClient dynamic.Interface
}

var invalidChars = regexp.MustCompile(`[^a-z0-9-]+`)
var repeatedHyphens = regexp.MustCompile(`-+`)

func NewService() (*Service, error) {
	config, err := loadConfig()
	if err != nil {
		return nil, err
	}
	client, err := kubernetes.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	dynamicClient, err := dynamic.NewForConfig(config)
	if err != nil {
		return nil, err
	}
	return &Service{
		client:        client,
		dynamicClient: dynamicClient,
	}, nil
}

func (s *Service) List(ctx context.Context) ([]Environment, error) {
	result, err := s.client.CoreV1().Namespaces().List(ctx, metav1.ListOptions{})
	if err != nil {
		return []Environment{}, err
	}
	environments := []Environment{}
	for _, namespace := range result.Items {
		environments = append(environments, Environment{Name: namespace.Name})
	}
	return environments, nil
}

func (s *Service) create(ctx context.Context, env Environment) (Environment, error) {
	// drop client provided labels
	// stamp environment name that this namespace represents
	env.Labels = map[string]string{
		"hvn.io/environment": toLabelValue(env.Name),
	}

	valErr := s.validateName(env.Name)
	existsErr := s.namespaceAlreadyExists(ctx, env.Name)
	if valErr != nil || existsErr != nil {
		generatedName, err := s.generateValidName(env.Name)
		if err != nil {
			return Environment{}, err
		}
		env.Name = generatedName
	}

	namespace := &corev1.Namespace{
		Name:   env.Name,
		Labels: env.Labels,
	}

	_, err := s.client.CoreV1().Namespaces().Create(ctx, namespace, metav1.CreateOptions{})
	if err != nil {
		return Environment{}, err
	}

	gateway := &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "gateway.networking.k8s.io/v1",
		"kind":       "Gateway",
		"spec": map[string]any{
			"gatewayClassName": "kgateway",
			"listeners": []any{
				map[string]any{
					"name":     "http",
					"protocol": "HTTP",
					"port":     int64(80),
				},
			},
		},
	}}
	gateway.SetName(env.Name + "-gateway")
	gateway.SetNamespace(env.Name)
	gateway.SetLabels(env.Labels)

	if _, err = s.dynamicClient.Resource(dynamicresources.GatewayGVR).Namespace(env.Name).Create(ctx, gateway, metav1.CreateOptions{}); err != nil {
		return Environment{}, fmt.Errorf("creating gateway: %w", err)
	}

	return env, nil
}

func (s *Service) validateName(name string) error {
	errors := validation.IsDNS1123Label(name)
	if len(errors) > 0 {
		return fmt.Errorf("Invalid namespace name")
	}
	return nil
}

func (s *Service) namespaceAlreadyExists(ctx context.Context, name string) error {
	_, err := s.client.CoreV1().Namespaces().Get(ctx, name, metav1.GetOptions{})
	if err != nil && apierrors.IsNotFound(err) {
		return nil
	}
	return fmt.Errorf("Namespace already exists or cannot use %v as the namespace name", name)
}

func (s *Service) generateValidName(name string) (string, error) {
	name = strings.ToLower(name)
	name = invalidChars.ReplaceAllString(name, "-")
	name = repeatedHyphens.ReplaceAllString(name, "-")
	name = strings.Trim(name, "-")

	if name == "" {
		name = "namespace"
	}

	randomBytes := make([]byte, 8)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", fmt.Errorf("generating unique suffix: %w", err)
	}
	unqName := hex.EncodeToString(randomBytes)
	return unqName, nil
}

func loadConfig() (*rest.Config, error) {
	config, err := rest.InClusterConfig()
	if err == nil {
		slog.Info("using in-cluster kubernetes config")
		return config, nil
	}
	if !errors.Is(err, rest.ErrNotInCluster) {
		return nil, err
	}

	config, err = clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
		clientcmd.NewDefaultClientConfigLoadingRules(),
		&clientcmd.ConfigOverrides{},
	).ClientConfig()
	if err != nil {
		return nil, fmt.Errorf("not in a cluster and no usable kubeconfig: %w", err)
	}
	slog.Info("using local kubeconfig", "host", config.Host)
	return config, nil
}

func toLabelValue(value string) string {
	return strings.ReplaceAll(value, " ", "_")
}
